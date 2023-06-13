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

const extract = (bookInfo, workDirs)=>{
    const pageKeys = Object.keys(bookInfo.pages)
    return new Promise((resolve)=>{
        Promise.all(
            pageKeys.map((pageKey)=>{
                const page = bookInfo.pages[pageKey]
                const inputPath = page.filePath
                const outputFile = 'crop-'+(""+((page.sortIndex + 2) * 10)).padStart(6, '0')+".jpg"
                const outputPath = path.join(workDirs.extract, outputFile)
                return imageMagick.crop(inputPath, page.selection, outputPath)
            }
        )).then(()=>{
            return Promise.all(
                pageKeys.map((pageKey)=>{
                    const page = bookInfo.pages[pageKey]
                    let rotation = ROTATION_LOOKUP[bookInfo.firstPageOrientation]
                    if(page.sortIndex > bookInfo.reverseIndex){
                        rotation += 180
                    }
                    const inputPath = path.join(workDirs.extract, 'crop-'+(""+((page.sortIndex + 2) * 10)).padStart(6, '0')+".jpg")
                    const outputFile = (""+((page.sortIndex + 2) * 10)).padStart(6, '0')+".jpg"
                    const outputPath = path.join(workDirs.extract, outputFile)
                    return imageMagick.rotate(inputPath, rotation, outputPath)
                    .then(()=>{
                        return new Promise((deleteResolve)=>{
                            fs.rmSync(inputPath)
                            deleteResolve()
                        })
                    })
                }
            ))
        }).then(()=>{
            resolve()
        })
    })
}

const stitch = (bookInfo, workDirs)=>{
    return new Promise((resolve)=>{
        let promises = []
        const files = util.getFiles(workDirs.extract)
        files.sort()
        const firstPageOutput = path.join(workDirs.stitch, (""+(50)).padStart(6, '0')+".jpg")
        fs.copyFileSync(files[0], firstPageOutput)
        for(let ii = 1; ii < Math.floor(files.length/2)-1; ii++){
            const leftPage = files[Math.floor(ii+files.length/2)-1]
            const rightPage = files[ii]
            const outputFile = path.join(workDirs.stitch, (""+((ii + 5) * 10)).padStart(6, '0')+".jpg")
            promises.push(imageMagick.stitch(leftPage, rightPage, outputFile))
        }
        if(files.length % 2 === 0){
            const lastPageOutput = path.join(workDirs.stitch, (""+((files.length + 5) * 10)).padStart(6, '0')+".jpg")
            fs.copyFileSync(files[files.length - 1], lastPageOutput)
        }
        Promise.all(promises)
        .then(()=>{
            resolve()
        })
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