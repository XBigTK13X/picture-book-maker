const settings = require('../../common/settings')
const path = require('path')
const fs = require('fs')

const infoDir = '00-info'
const extractDir = '10-extract'
const stitchDir = '20-stitch'
const outputDir = '25-output'
const exportDir = '30-export'

const prepDir = (bookName) => {
    if(!bookName){
        return null
    }
    if (!fs.existsSync(settings.dataDir)){
        fs.mkdirSync(settings.dataDir);
    }
    const dirs = getDirs(bookName)
    for(let key of Object.keys(dirs)){
        if (!fs.existsSync(dirs[key])){
            fs.mkdirSync(dirs[key])
        }
    }
}

const getDirs = (bookName) => {
    if(!bookName){
        return null
    }
    const infoPath = path.join(settings.dataDir,'work/', bookName+'/', infoDir+'/')
    const extractPath = path.join(settings.dataDir,'work/', bookName+'/', extractDir+'/')
    const stitchPath = path.join(settings.dataDir, 'work/', bookName+'/', stitchDir+'/')
    return {
        root:    path.join(settings.dataDir,'work/', bookName+'/'),
        info:    infoPath,
        extract: extractPath,
        distort: path.join(extractPath, '10-distort/'),
        crop:    path.join(extractPath, '20-crop/'),
        rotate:  path.join(extractPath, '30-rotate/'),
        stitch:  stitchPath,
        resize:  path.join(stitchPath,'10-resize/'),
        merge:   path.join(stitchPath,'20-merge/'),
        color:   path.join(stitchPath,'30-color/'),
        output:  path.join(settings.dataDir, 'work/', bookName+'/', outputDir+'/'),
        export:  path.join(settings.dataDir, 'work/', bookName+'/', exportDir+'/'),
    }
}

module.exports = {
    getDirs,
    prepDir
}