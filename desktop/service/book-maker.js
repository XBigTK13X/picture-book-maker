const path = require('path')
const fs = require('fs')
const imageMagick = require('./image-magick')
const util = require('../../common/util')

const ROTATION_LOOKUP = {
    'up': 90,
    'right': 0,
    'down': 270,
    'left': 180
}

const WORK_FORMAT = '.jpg'
const EXPORT_FORMAT = '.jpg'

const distortedFile = (sortIndex)=>{
    return 'distort-'+(""+((sortIndex + 2) * 10)).padStart(6, '0') + WORK_FORMAT
}

const croppedFile = (sortIndex)=>{
    return 'crop-'+(""+((sortIndex + 2) * 10)).padStart(6, '0') + WORK_FORMAT
}

const extractedFile = (sortIndex)=>{
    return (""+((sortIndex + 2) * 10)).padStart(6, '0') + WORK_FORMAT
}

const stitchedFile = (sortIndex)=>{
    return (""+((sortIndex + 5) * 10)).padStart(6, '0') + EXPORT_FORMAT
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
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = page.filePath
            const outputPath = path.join(workDirs.extract, distortedFile(page.sortIndex))
            promises.push(()=>{return {promise: imageMagick.distortPerspective(inputPath, page.selection, outputPath), message: `Distort image ${distortIndex++} of ${pageKeys.length}`}})
        }
        await batch(promises, BATCH_SIZE)
        let cropIndex = 1
        promises = []
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            const inputPath = path.join(workDirs.extract, distortedFile(page.sortIndex))
            const outputPath = path.join(workDirs.extract, croppedFile(page.sortIndex))
            promises.push(()=>{return {promise: imageMagick.crop(inputPath, page.selection, outputPath), message: `Crop image ${cropIndex++} of ${pageKeys.length}`}})
        }
        await batch(promises, BATCH_SIZE)
        let rotateIndex = 1
        promises = []
        for(let pageKey of pageKeys){
            const page = bookInfo.pages[pageKey]
            let rotation = ROTATION_LOOKUP[bookInfo.firstPageOrientation]
            if(page.sortIndex > bookInfo.reverseIndex){
                rotation += 180
            }
            const inputPath = path.join(workDirs.extract, croppedFile(page.sortIndex))
            const outputPath = path.join(workDirs.extract, extractedFile(page.sortIndex))
            promises.push(()=>{return {
                message: `Rotate image ${rotateIndex++} of ${pageKeys.length}`,
                promise: imageMagick.rotate(inputPath, rotation, outputPath)
                    .then(()=>{
                        return new Promise((deleteResolve)=>{
                            fs.rmSync(path.join(workDirs.extract, distortedFile(page.sortIndex)))
                            fs.rmSync(path.join(workDirs.extract, croppedFile(page.sortIndex)))
                            deleteResolve()
                        })
                    }),
                }
            })
        }
        await batch(promises, BATCH_SIZE)
        resolve()
    })
}

const stitch = (bookInfo, workDirs)=>{
    return new Promise(async (resolve)=>{
        const files = util.getFiles(workDirs.extract)
        files.sort()
        const firstPageOutput = path.join(workDirs.stitch, stitchedFile(0))
        await imageMagick.convert(files[0], firstPageOutput)
        for(let ii = 1; ii < Math.floor(files.length / 2) - 1; ii++){
            const leftPage = files[Math.floor(ii+files.length/2)-1]
            const rightPage = files[ii]
            const outputFile = path.join(workDirs.stitch, stitchedFile(ii))
            await imageMagick.stitch(leftPage, rightPage, outputFile)
        }
        if(files.length % 2 === 0){
            const lastPageOutput = path.join(workDirs.stitch, stitchedFile(files.length + 5))
            await imageMagick.convert(files[files.length - 1], lastPageOutput)
        }
        resolve()
    })
}

const archive = (bookInfo, workDirs)=>{
    return Promise.resolve()
}

module.exports = {
    extract,
    stitch,
    archive
}