const settings = require('../../common/settings')
const path = require('path')
const fs = require('fs')

const infoDir = '00-info'
const extractDir = '10-extract'
const stitchDir = '20-stitch'
const exportDir = '30-export'

const prepDir = (bookName) => {
    if(!bookName){
        return null
    }
    if (!fs.existsSync(settings.dataDir)){
        fs.mkdirSync(settings.dataDir);
    }
    const workDir = path.join(settings.dataDir,'work/')
    if (!fs.existsSync(workDir)){
        fs.mkdirSync(workDir);
    }
    const bookWorkDir = path.join(workDir, bookName+'/')
    if (!fs.existsSync(bookWorkDir)){
        fs.mkdirSync(bookWorkDir);
        fs.mkdirSync(path.join(bookWorkDir, infoDir + '/'));
        fs.mkdirSync(path.join(bookWorkDir, extractDir + '/'));
        fs.mkdirSync(path.join(bookWorkDir, stitchDir + '/'))
        fs.mkdirSync(path.join(bookWorkDir, exportDir + '/'))
    }
}

const getDirs = (bookName) => {
    if(!bookName){
        return null
    }
    return {
        info: path.join(settings.dataDir,'work/', bookName+'/', infoDir+'/'),
        extract: path.join(settings.dataDir,'work/', bookName+'/', extractDir+'/'),
        stitch: path.join(settings.dataDir,'work/', bookName+'/', stitchDir+'/'),
        export: path.join(settings.dataDir,'work/', bookName+'/', exportDir+'/')
    }
}

const clean = (bookName) => {
    if(!bookName){
        return null
    }
    const dirs = getDirs(bookName)
    fs.rmSync(dirs.extract, {recursive: true, force: true})
    fs.rmSync(dirs.stitch, {recursive: true, force: true})
    fs.rmSync(dirs.export, {recursive: true, force: true})
    fs.mkdirSync(dirs.extract)
    fs.mkdirSync(dirs.stitch)
    fs.mkdirSync(dirs.export)
}

module.exports = {
    clean,
    getDirs,
    prepDir
}