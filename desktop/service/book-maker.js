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

const batch = (promiseMakers, chunk)=>{
    return new Promise(async (resolve)=>{
        for(let ii = 0; ii < promiseMakers.length; ii+=chunk){
            await Promise.all(promiseMakers.slice(ii, ii+chunk).map((p)=>{
                let res = p()
                util.serverLog(res.message)
                return res.promise
            }))
        }
        resolve()
    })
}

const BATCH_SIZE = 6
const extract = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        const pageKeys = Object.keys(bookInfo.pages)
        let distortIndex = 1
        let promises = []
        const distortDir = path.join(workDirs.extract,'distort/')
        if(!fs.existsSync(distortDir)){
            fs.mkdirSync(distortDir)
        }
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = page.filePath
            const outputPath = path.join(distortDir, workFile(page.sortIndex))
            promises.push(()=>{return {
                promise: imageMagick.distort(inputPath, page.selection, outputPath),
                message: `Distort image ${distortIndex++} of ${pageKeys.length}`
            }})
        }
        await batch(promises, BATCH_SIZE)
        let cropIndex = 1
        promises = []
        const cropDir = path.join(workDirs.extract, 'crop/')
        if(!fs.existsSync(cropDir)){
            fs.mkdirSync(cropDir)
        }
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = path.join(distortDir, workFile(page.sortIndex))
            const outputPath = path.join(cropDir, workFile(page.sortIndex))
            promises.push(()=>{return {
                promise: imageMagick.crop(inputPath, page.selection, outputPath),
                message: `Crop image ${cropIndex++} of ${pageKeys.length}`
            }})
        }
        await batch(promises, BATCH_SIZE)
        let rotateIndex = 1
        promises = []
        const reverseIndex = bookInfo.getReverseIndex()
        const rotateDir = path.join(workDirs.extract, 'rotate/')
        if(!fs.existsSync(rotateDir)){
            fs.mkdirSync(rotateDir)
        }
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            let rotation = ROTATION_LOOKUP[bookInfo.firstPageOrientation]
            if(page.sortIndex > reverseIndex){
                rotation += 180
            }
            const inputPath = path.join(cropDir, workFile(page.sortIndex))
            const outputPath = path.join(rotateDir, workFile(page.sortIndex))
            promises.push(()=>{return {
                message: `Rotate image ${rotateIndex++} of ${pageKeys.length}`,
                promise: imageMagick.rotate(inputPath, rotation, outputPath)
            }})
        }
        await batch(promises, BATCH_SIZE)
        resolve()
    })
}

const stitch = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        const files = util.getFiles(path.join(workDirs.extract,'rotate/'))
        files.sort()
        const resizeDir = path.join(workDirs.stitch, 'resize/')
        if(!fs.existsSync(resizeDir)){
            fs.mkdirSync(resizeDir)
        }
        const outputDir = path.join(workDirs.stitch, 'output/')
        if(!fs.existsSync(outputDir)){
            fs.mkdirSync(outputDir)
        }
        const firstPageOutput = path.join(outputDir, workFile(0, EXPORT_FORMAT))
        await imageMagick.convert(files[0], firstPageOutput)
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

        for(let ii = 1; ii < Math.floor(files.length / 2) - 1; ii++){
            const leftPageIndex = Math.floor(ii+files.length/2)-1
            const leftPage = files[leftPageIndex]
            const rightPage = files[ii]
            const leftPageResized = path.join(resizeDir, path.basename(leftPage))
            const rightPageResized = path.join(resizeDir, path.basename(rightPage))
            util.serverLog(`Resizing images ${ii} and ${leftPageIndex}`)
            await imageMagick.resize(leftPage, min.width, min.height, leftPageResized)
            await imageMagick.resize(rightPage, min.width, min.height, rightPageResized)
            const outputFile = path.join(outputDir, workFile(ii, EXPORT_FORMAT))
            util.serverLog(`Stitching images ${ii} and ${leftPageIndex}`)
            await imageMagick.stitch(leftPageResized, rightPageResized, outputFile)
        }
        if(files.length % 2 === 0){
            const lastPageOutput = path.join(outputDir, workFile(files.length + 5, EXPORT_FORMAT))
            await imageMagick.convert(files[files.length - 1], lastPageOutput)
        }
        resolve()
    })
}

const archive = (bookInfo, workDirs)=>{
    const exportFile = bookInfo.bookName + ".cbz"
    const exportPath = path.join(workDirs.export, exportFile)
    return new Promise((resolve)=>{
        const output = fs.createWriteStream(exportPath)
        const archive = archiver('zip', {
            zlib: {
                level: 0 //The images are already compressed, I just want them in a CBZ format
            }
        })
        output.on('close', ()=>{
            resolve()
        })
        archive.pipe(output)
        archive.directory(path.join(workDirs.stitch,'output/'), bookInfo.bookName)
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