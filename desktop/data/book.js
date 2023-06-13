const sources = require('./sources')
const util = require('../../common/util')
const path = require('path')
const fs = require("fs")
const workspace = require('../service/workspace')
const BookInfo = require('./book-info')

const getPages = (sourceIndex, bookName)=>{
    const sourcePath = sources.getByIndex(sourceIndex)
    let pagePaths = util.getFiles(path.join(sourcePath,bookName))
    let pages = []
    for(let page of pagePaths){
        if( page.indexOf('.jpeg') !== -1 ||
            page.indexOf('.jpg') !== -1 ||
            page.indexOf('.png') !== -1
        ){
            pages.push(page)
        }
    }
    pagePaths.sort()
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

const getInfo = (sourceIndex, bookName) => {
    const workDirs = workspace.getDirs(bookName)
    const infoPath = path.join(workDirs.info, 'info.json')
    if(fs.existsSync(infoPath)){
        const dict = JSON.parse(fs.readFileSync(infoPath))
        let info = new BookInfo()
        info.fromDict(dict)
        return info
    }
    const info = new BookInfo(bookName)
    const pages = getPages(sourceIndex, bookName)
    let sortIndex = 0
    for(let page of pages){
        info.pages[page] = {
            filePath: page,
            sortIndex: sortIndex,
            hidden: false,
            selection: null
        }
        sortIndex += 1
    }
    info.reverseIndex = Math.floor(pages.length / 2)
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

const setSelection = (sourceIndex, bookName, pagePath, selection) => {
    const workDirs = workspace.getDirs(bookName)
    const infoPath = path.join(workDirs.info, 'info.json')
    const info = getInfo(sourceIndex, bookName)
    info.setSelection(pagePath, selection)
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

module.exports = {
    getPages,
    movePages,
    getInfo,
    setSelection
}