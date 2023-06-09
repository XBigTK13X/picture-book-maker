const path = require('path')
const fs = require('fs')
const sizeOf = require('image-size')
const archiver = require('archiver')
const util = require('../../common/util')
const settings = require('../../common/settings')
const imageMagick = require('./image-magick')


const ROTATION_LOOKUP = {
    'up': 90,
    'right': 0,
    'down': 270,
    'left': 180
}

const WORK_FORMAT = '.jpg'
const EXPORT_FORMAT = '.jpg'

const workFile = (sortIndex, format)=>{
    return (""+((sortIndex + 5) * 10)).padStart(6, '0') + (format?format:WORK_FORMAT)
}

const extract = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        const pageKeys = bookInfo.getKeys()
        let distortIndex = 1
        let promises = []
        const distortDir = path.join(workDirs.extract,'10-distort/')
        if(!fs.existsSync(distortDir)){
            fs.mkdirSync(distortDir)
        }
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = page.filePath
            const outputPath = path.join(distortDir, workFile(page.sortIndex))
            if(fs.existsSync(outputPath)){
                continue
            }
            promises.push(()=>{return {
                promise: imageMagick.distort(inputPath, page.selection, outputPath),
                message: `Distort image ${distortIndex++} of ${pageKeys.length}`
            }})
        }

        await util.serialBatchPromises(promises)
        let cropIndex = 1
        promises = []
        const cropDir = path.join(workDirs.extract, '20-crop/')
        if(!fs.existsSync(cropDir)){
            fs.mkdirSync(cropDir)
        }
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = path.join(distortDir, workFile(page.sortIndex))
            const outputPath = path.join(cropDir, workFile(page.sortIndex))
            if(fs.existsSync(outputPath)){
                continue
            }
            promises.push(()=>{return {
                promise: imageMagick.crop(inputPath, page.selection, outputPath),
                message: `Crop image ${cropIndex++} of ${pageKeys.length}`
            }})
        }
        await util.serialBatchPromises(promises)

        if(!bookInfo.skipStitching){
            let rotateIndex = 1
            promises = []
            const reverseIndex = bookInfo.getReverseIndex()
            const rotateDir = path.join(workDirs.extract, '30-rotate/')
            if(!fs.existsSync(rotateDir)){
                fs.mkdirSync(rotateDir)
            }
            for(let ii = 0; ii < pageKeys.length; ii++){
                const page = bookInfo.pages[pageKeys[ii]]
                let rotation = ROTATION_LOOKUP[bookInfo.firstPageOrientation]
                if(ii >= reverseIndex){
                    rotation += 180
                }
                if(bookInfo.sequentialStitching){
                    rotation = ROTATION_LOOKUP[bookInfo.firstPageOrientation]
                    if(ii % 2 === 1){
                        rotation += 180
                    }
                }
                if(bookInfo.singleRotation){
                    rotation = ROTATION_LOOKUP[bookInfo.firstPageOrientation]
                }
                const inputPath = path.join(cropDir, workFile(page.sortIndex))
                const outputPath = path.join(rotateDir, workFile(page.sortIndex))
                if(fs.existsSync(outputPath)){
                    continue
                }
                promises.push(()=>{return {
                    promise: imageMagick.rotate(inputPath, rotation, outputPath),
                    message: `Rotate image ${rotateIndex++} of ${pageKeys.length}`
                }})
            }
            await util.serialBatchPromises(promises)
        }
        resolve()
    })
}

const stitch = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        let sourceFiles = path.join(workDirs.extract,'30-rotate/')
        if(bookInfo.skipStitching){
            sourceFiles = path.join(workDirs.extract,'20-crop/')
        }
        const files = util.getFiles(sourceFiles)
        files.sort((a,b)=>{
            return parseInt(path.basename(a).split('.')[0],10) - parseInt(path.basename(b).split('.')[0],10)
        })
        const resizeDir = path.join(workDirs.stitch, '10-resize/')
        if(!fs.existsSync(resizeDir)){
            fs.mkdirSync(resizeDir)
        }
        const mergeDir = path.join(workDirs.stitch, '20-merge/')
        if(!fs.existsSync(mergeDir)){
            fs.mkdirSync(mergeDir)
        }
        const colorDir = path.join(workDirs.stitch, '30-color/')
        if(!fs.existsSync(colorDir)){
            fs.mkdirSync(colorDir)
        }

        util.serverLog(`Preparing covers`)
        const frontCover = path.join(mergeDir, workFile(0))
        const frontCoverOutput = path.join(colorDir, workFile(0,EXPORT_FORMAT))
        const brightness = settings.colorCorrection.brightnessPercent
        await imageMagick.convert(files[0], frontCover)
        await imageMagick.normalize(frontCover, brightness.cover, frontCoverOutput)
        let backCoverIndex = files.length - 1
        if(bookInfo.collateBackwards){
            backCoverIndex = bookInfo.getReverseIndex()
        }
        const backCover = path.join(mergeDir, workFile(files.length + 5, EXPORT_FORMAT))
        const backCoverOutput = path.join(colorDir, workFile(files.length + 5, EXPORT_FORMAT))
        await imageMagick.convert(files[backCoverIndex], backCover)
        await imageMagick.normalize(backCover, brightness.cover, backCoverOutput)

        let min = {
            height: 1000000,
            width:  1000000
        }
        for(let ii = 1; ii < files.length-1; ii++){
            const dimensions = sizeOf(files[ii])
            if(dimensions.width < min.width){
                min.width = dimensions.width
            }
            if(dimensions.height < min.height){
                min.height = dimensions.height
            }
        }

        util.serverLog(`Found a minimum image size of ${min.width} x ${min.height}`)
        if(min.width > 2000 || min.height > 2000){
            util.serverLog(`Cutting minimum resolution in half to decrease output size`)
            min.height = Math.floor(min.height / 2)
            min.width = Math.floor(min.width / 2)
        }

        let resizePromises = []
        let stitchPromises = []
        let colorPromises = []
        if(bookInfo.skipStitching){
            for(let ii = 1; ii < files.length - 1; ii++){
                const page = files[ii]
                const pageResized = path.join(resizeDir, path.basename(page))
                if(!fs.existsSync(pageResized)){
                    resizePromises.push(()=>{return {
                        promise: imageMagick.resize(page, min.width, min.height, pageResized),
                        message: `Resize page image [${ii}] (${ii}/${files.length - 2})`
                    }})
                }
                const colorFile = path.join(colorDir, workFile(ii,EXPORT_FORMAT))
                if(!fs.existsSync(colorFile)){
                    colorPromises.push(()=>{return {
                        promise: imageMagick.normalize(pageResized, brightness.page, colorFile),
                        message: `Color correcting image ${ii}`
                    }})
                }
            }
        }
        else {
            const stitchMiddleIndex = bookInfo.sequentialStitching ? files.length - 2 : bookInfo.getReverseIndex()
            const stitchIncrement = bookInfo.sequentialStitching ? 2 : 1
            for(let ii = 1; ii < stitchMiddleIndex; ii = ii + stitchIncrement){
                let leftPageIndex = ii + stitchMiddleIndex - 1
                let rightPageIndex = ii
                if(bookInfo.collateBackwards){
                    leftPageIndex = (files.length - ii)
                }
                if(bookInfo.sequentialStitching){
                    leftPageIndex = ii
                    rightPageIndex = ii+1
                }
                const leftPage = files[leftPageIndex]
                const rightPage = files[rightPageIndex]
                const leftPageResized = path.join(resizeDir, path.basename(leftPage))
                const rightPageResized = path.join(resizeDir, path.basename(rightPage))
                if(!fs.existsSync(leftPageResized)){
                    resizePromises.push(()=>{return {
                        promise: imageMagick.resize(leftPage, min.width, min.height, leftPageResized),
                        message: `Resize left page image [${leftPageIndex}] (${ii}/${stitchMiddleIndex-1})`
                    }})
                }
                if(!fs.existsSync(rightPageResized)){
                    resizePromises.push(()=>{return {
                        promise: imageMagick.resize(rightPage, min.width, min.height, rightPageResized),
                        message: `Resize right page image [${ii} (${ii}/${stitchMiddleIndex-1})]`
                    }})
                }
                const mergeFile = path.join(mergeDir, workFile(ii))
                if(!fs.existsSync(mergeFile)){
                    stitchPromises.push(()=>{return {
                        promise: imageMagick.stitch(leftPageResized, rightPageResized, mergeFile),
                        message: `Stitching images ${ii} and ${leftPageIndex} (${ii}/${stitchMiddleIndex-1})`
                    }})
                }
                const colorFile = path.join(colorDir, workFile(ii,EXPORT_FORMAT))
                if(!fs.existsSync(colorFile)){
                    colorPromises.push(()=>{return {
                        promise: imageMagick.normalize(mergeFile, brightness.page, colorFile),
                        message: `Color correcting image ${ii}`
                    }})
                }
            }
        }
        await util.serialBatchPromises(resizePromises)
        await util.serialBatchPromises(stitchPromises)
        await util.serialBatchPromises(colorPromises)
        resolve()
    })
}

const archive = (bookInfo, workDirs)=>{
    const exportFile = bookInfo.bookName + ".cbz"
    const exportPath = path.join(workDirs.export, exportFile)
    return new Promise((resolve)=>{
        const output = fs.createWriteStream(exportPath)
        // The images are already compressed, I just want them in a CBZ format
        // However, zlib generates invalid archives on Android when compression level 0 is used
        const archive = archiver('zip', {
            zlib: {
                level: 1
            }
        })
        output.on('close', ()=>{
            resolve()
        })
        archive.pipe(output)
        archive.directory(path.join(workDirs.stitch,'30-color/'), bookInfo.bookName)
        archive.finalize()
    })
    .then(()=>{
        return new Promise(resolve=>{
            if(settings.localLibraryPath){
                const localDir = path.join(settings.localLibraryPath, bookInfo.category+"/")
                if(!fs.existsSync(localDir)){
                    fs.mkdirSync(localDir)
                }
                fs.copyFileSync(exportPath, path.join(localDir, exportFile))
            }
            if(settings.remoteLibraryPath){
                const remoteDir = path.join(settings.remoteLibraryPath, bookInfo.category+"/")
                if(!fs.existsSync(remoteDir)){
                    fs.mkdirSync(remoteDir)
                }
                fs.copyFileSync(exportPath, path.join(remoteDir, exportFile))
            }
            resolve()
        })
    })
}

module.exports = {
    archive,
    extract,
    stitch
}