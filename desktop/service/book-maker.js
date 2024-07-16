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
    if(!sortIndex && sortIndex !==0){
        throw new Error(`sortIndex is required. Was passed [${sortIndex}]`)
    }
    return (""+((sortIndex + 5) * 10)).padStart(6, '0') + (format?format:WORK_FORMAT)
}

const _distort = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        util.serverLog(`Distorting images in book`)
        const pageKeys = bookInfo.getKeys()
        let distortIndex = 1
        let promises = []

        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = page.filePath
            const outputPath = path.join(workDirs.distort, workFile(page.sortIndex))
            if(fs.existsSync(outputPath)){
                continue
            }
            promises.push(()=>{return {
                promise: imageMagick.distort(inputPath, page.selection, outputPath),
                message: `Distort image (${distortIndex++}/${pageKeys.length})`
            }})
        }
        await util.serialBatchPromises(promises)
        bookInfo.previousStepDir = workDirs.distort
        resolve(bookInfo)
    })
}

const _crop = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        util.serverLog(`Cropping files from dir [${bookInfo.previousStepDir}]`)
        const pageKeys = bookInfo.getKeys()
        let cropIndex = 1
        let promises = []

        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = path.join(bookInfo.previousStepDir, workFile(page.sortIndex))
            const outputPath = path.join(workDirs.crop, workFile(page.sortIndex))
            if(fs.existsSync(outputPath)){
                continue
            }
            promises.push(()=>{return {
                promise: imageMagick.crop(inputPath, page.selection, outputPath),
                message: `Crop image (${cropIndex++}/${pageKeys.length})`
            }})
        }
        await util.serialBatchPromises(promises)
        bookInfo.previousStepDir = workDirs.crop
        resolve(bookInfo)
    })
}

const _rotate = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        util.serverLog(`Rotating files from dir [${bookInfo.previousStepDir}]`)
        const sortedFiles = util.getFiles(bookInfo.previousStepDir)
        sortedFiles.sort((a,b)=>{
            return parseInt(path.basename(a).split('.')[0],10) - parseInt(path.basename(b).split('.')[0],10)
        })
        let rotateIndex = 1
        let promises = []
        const reverseIndex = bookInfo.getReverseIndex()
        for(let ii = 0; ii < sortedFiles.length; ii++){
            const page = sortedFiles[ii]
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
            const inputPath = path.join(bookInfo.previousStepDir, workFile(ii))
            const outputPath = path.join(workDirs.rotate, workFile(ii))
            if(fs.existsSync(outputPath)){
                continue
            }
            promises.push(()=>{return {
                promise: imageMagick.rotate(inputPath, rotation, outputPath),
                message: `Rotate image (${rotateIndex++}/${sortedFiles.length})`
            }})
        }
        await util.serialBatchPromises(promises)
        bookInfo.previousStepDir = workDirs.rotate
        resolve(bookInfo)
    })
}

const extract = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        bookInfo = await _distort(bookInfo, workDirs)
        bookInfo = await _crop(bookInfo, workDirs)
        bookInfo = await _rotate(bookInfo, workDirs)
        resolve(bookInfo)
    })
}

const _covers = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        util.serverLog(`Preparing covers from files from dir [${bookInfo.previousStepDir}]`)
        const sortedFiles = util.getFiles(bookInfo.previousStepDir)
        sortedFiles.sort((a,b)=>{
            return parseInt(path.basename(a).split('.')[0],10) - parseInt(path.basename(b).split('.')[0],10)
        })
        const frontCover = path.join(bookInfo.previousStepDir, workFile(0))
        const frontCoverOutput = path.join(workDirs.output, workFile(0, EXPORT_FORMAT))
        util.serverLog(`Copying front cover from [${frontCover}]`)
        const brightness = settings.colorCorrection.brightnessPercent
        if(bookInfo.skipColoring){
            await imageMagick.convert(sortedFiles[0], frontCoverOutput)
        } else {
            await imageMagick.convert(sortedFiles[0], frontCover)
            await imageMagick.normalize(frontCover, brightness.cover, frontCoverOutput)
        }
        if(!bookInfo.skipArchive){
            if(settings.localLibraryPath){
                let thumbnailPath = path.join(settings.localLibraryPath, ".thumbnails/", bookInfo.bookName + ".jpg")
                await imageMagick.resizeGentle(frontCoverOutput, 400, 400, thumbnailPath)
            }
            if(settings.remoteLibraryPath){
                let thumbnailPath = path.join(settings.remoteLibraryPath, ".thumbnails/", bookInfo.bookName + ".jpg")
                await imageMagick.resizeGentle(frontCoverOutput, 400, 400, thumbnailPath)
            }
        }

        let backCoverIndex = sortedFiles.length - 1
        if(bookInfo.collateBackwards){
            backCoverIndex = bookInfo.getReverseIndex()
        }
        const backCover = path.join(bookInfo.previousStepDir, workFile(backCoverIndex))
        const backCoverOutput = path.join(workDirs.output, workFile(backCoverIndex, EXPORT_FORMAT))
        util.serverLog(`Copying back cover from ${backCover}`)
        if(bookInfo.skipColoring){
            await imageMagick.convert(sortedFiles[backCoverIndex], backCoverOutput)
        } else {
            await imageMagick.convert(sortedFiles[backCoverIndex], backCover)
            await imageMagick.normalize(backCover, brightness.cover, backCoverOutput)
        }
        bookInfo.frontCover = frontCover
        bookInfo.backCover = backCover
        resolve(bookInfo)
    })
}

const _resize = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        util.serverLog(`Resizing files from dir [${bookInfo.previousStepDir}]`)
        const files = util.getFiles(bookInfo.previousStepDir)
        let promises = []
        let min = {
            height: 1000000,
            width:  1000000
        }
        for(let ii = 0; ii < files.length; ii++){
            if(files[ii] === bookInfo.frontCover || files[ii] === bookInfo.backCover){
                continue
            }
            const dimensions = sizeOf(files[ii])
            if(dimensions.width < min.width){
                min.width = dimensions.width
            }
            if(dimensions.height < min.height){
                min.height = dimensions.height
            }
        }

        util.serverLog(`Found a minimum image size of ${min.width} x ${min.height}`)
        if(!bookInfo.skipShrink){
            if(min.width > 2000 || min.height > 2000){
                util.serverLog(`Cutting minimum resolution in half to decrease output size`)
                min.height = Math.floor(min.height / 2)
                min.width = Math.floor(min.width / 2)
            }
        } else {
            util.serverLog(`Book configured to skip shrinking`)
        }

        for(let ii=0; ii<files.length; ii++){
            if(files[ii] === bookInfo.frontCover || files[ii] === bookInfo.backCover){
                continue
            }
            const resizedPage = path.join(workDirs.resize, path.basename(files[ii]))
            if(!fs.existsSync(resizedPage)){
                promises.push(()=>{return {
                    promise: imageMagick.resize(files[ii], min.width, min.height, resizedPage),
                    message: `Resize left page image (${ii}/${files.length})`
                }})
            }
        }

        await util.serialBatchPromises(promises)
        bookInfo.previousStepDir = workDirs.resize
        resolve(bookInfo)
    })
}

const _merge = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        if(bookInfo.skipStitching){
            return resolve(bookInfo)
        }
        util.serverLog(`Merging files from dir [${bookInfo.previousStepDir}]`)
        const sortedFiles = util.getFiles(bookInfo.previousStepDir)
        sortedFiles.sort((a,b)=>{
            return parseInt(path.basename(a).split('.')[0],10) - parseInt(path.basename(b).split('.')[0],10)
        })
        let promises = []
        const stitchMiddleIndex = bookInfo.sequentialStitching ? sortedFiles.length-1 : bookInfo.getReverseIndex()
        const stitchIncrement = bookInfo.sequentialStitching ? 2 : 1
        let mergeIndex = 1
        for(let ii = 0; ii < stitchMiddleIndex; ii = ii + stitchIncrement){
            let leftPageIndex = ii + stitchMiddleIndex
            let rightPageIndex = ii + 1
            if(bookInfo.collateBackwards){
                leftPageIndex = ii
                rightPageIndex = (sortedFiles.length - ii - 1)
            }
            if(bookInfo.sequentialStitching){
                leftPageIndex = ii
                rightPageIndex = ii+1
            }
            let leftPage = path.join(bookInfo.previousStepDir, path.basename(sortedFiles[leftPageIndex]))
            let rightPage = path.join(bookInfo.previousStepDir, path.basename(sortedFiles[rightPageIndex]))
            const mergeFile = path.join(workDirs.merge, workFile(ii+1))
            if(!fs.existsSync(mergeFile)){
                promises.push(()=>{return {
                    promise: imageMagick.stitch(leftPage, rightPage, mergeFile),
                    message: `Stitching images ${leftPageIndex} and ${rightPageIndex}. Merge (${mergeIndex++}/${stitchMiddleIndex/2})`
                }})
            }
        }
        await util.serialBatchPromises(promises)
        bookInfo.previousStepDir = workDirs.merge
        resolve(bookInfo)
    })
}

const _color = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        if(bookInfo.skipColoring){
            return resolve(bookInfo)
        }
        const brightness = settings.colorCorrection.brightnessPercent
        util.serverLog(`Coloring files from dir [${bookInfo.previousStepDir}]`)
        let promises = []
        const files = util.getFiles(bookInfo.previousStepDir)
        for(let ii = 0; ii < files.length; ii++){
            const colorFile = path.join(workDirs.color, workFile(ii))
            if(!fs.existsSync(colorFile)){
                promises.push(()=>{return {
                    promise: imageMagick.normalize(files[ii], brightness.page, colorFile),
                    message: `Color correcting image (${ii}/${files.length})`
                }})
            }
        }
        await util.serialBatchPromises(promises)
        bookInfo.previousStepDir = workDirs.color
        resolve(bookInfo)
    })
}

const _output = async (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        util.serverLog(`Outputting files from dir [${bookInfo.previousStepDir}]`)
        const files = util.getFiles(bookInfo.previousStepDir)
        let promises = []
        for(let ii=0; ii< files.length; ii++){
            let parsedPath = path.parse(files[ii])
            const outputFile = path.join(workDirs.output, parsedPath.name + EXPORT_FORMAT)
            if(!fs.existsSync(outputFile)){
                if(parsedPath.ext === EXPORT_FORMAT){
                    promises.push(()=>{return {
                        promise: imageMagick.copy(files[ii], outputFile),
                        message: `Copying image to output dir (${ii}/${files.length})`
                    }})
                }
                else {
                    promises.push(()=>{return {
                        promise: imageMagick.convert(files[ii], outputFile),
                        message: `Converting image to target export format (${ii}/${files.length})`
                    }})
                }
            }
        }
        await util.serialBatchPromises(promises)
        bookInfo.previousStepDir = workDirs.output
        resolve(bookInfo)
    })
}

const stitch = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        const sortedFiles = util.getFiles(bookInfo.previousStepDir)
        sortedFiles.sort((a,b)=>{
            return parseInt(path.basename(a).split('.')[0],10) - parseInt(path.basename(b).split('.')[0],10)
        })

        bookInfo = await _covers(bookInfo, workDirs)
        bookInfo = await _resize(bookInfo, workDirs)
        bookInfo = await _merge(bookInfo, workDirs)
        bookInfo = await _color(bookInfo, workDirs)
        bookInfo = await _output(bookInfo, workDirs)

        resolve(bookInfo)
    })
}

const archive = (bookInfo, workDirs)=>{
    if(bookInfo.skipArchive){
        return new Promise(resolve=>{
            return resolve(bookInfo)
        })
    }
    const exportFile = bookInfo.bookName + ".cbz"
    const exportPath = path.join(workDirs.export, exportFile)
    input_dir = path.join(workDirs.output)
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
        archive.directory(input_dir, bookInfo.bookName)
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