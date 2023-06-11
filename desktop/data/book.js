const sources = require('./sources')
const util = require('../../common/util')
const path = require('path')
const fs = require("fs")

const getPages = (sourceIndex, bookName)=>{
    const sourcePath = sources.getByIndex(sourceIndex)
    let pagePaths = util.getFiles(sourcePath)
    pagePaths.sort()
    let pages = []
    for(let page of pagePaths){
        const book = path.basename(path.dirname(page))
        if( book === bookName && (
            page.indexOf('.jpeg') !== -1 ||
            page.indexOf('.jpg') !== -1 ||
            page.indexOf('.png') !== -1
        )){
            pages.push(page)
        }
    }
    return pages
}

const movePages = (sourceIndex, newBookName, pagePaths) => {
    const source = sources.getByIndex(sourceIndex)
    const targetBookDir = path.join(source, newBookName)
    if (!fs.existsSync(targetBookDir)){
        fs.mkdirSync(targetBookDir);
    }
    for(let pagePath of pagePaths){
        fs.renameSync(pagePath, path.join(targetBookDir, path.basename(pagePath)))
    }
}

module.exports = {
    getPages,
    movePages
}