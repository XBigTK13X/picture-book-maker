const sources = require('./sources')
const util = require('../../common/util')
const path = require('path')
const fs = require("fs")
const workspace = require('../service/workspace')
const BookInfo = require('./book-info')

const getPages = (sourceIndex, bookName)=>{
    const sourcePath = sources.getByIndex(sourceIndex)
    let rootPath = path.join(sourcePath,bookName)
    if(path.basename(sourcePath) === bookName){
        rootPath = sourcePath
    }
    let pagePaths = util.getFiles(rootPath)
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

const movePages = (sourceIndex, oldBookName, newBookName, pagePaths) => {
    const source = sources.getByIndex(sourceIndex)
    const targetBookDir = path.join(source, newBookName)
    if (!fs.existsSync(targetBookDir)){
        fs.mkdirSync(targetBookDir);
    }
    let oldInfo = getInfo(sourceIndex, oldBookName)
    let newInfo = getInfo(sourceIndex, newBookName)
    for(let pagePath of pagePaths){
        const newPagePath = path.join(targetBookDir, path.basename(pagePath))
        newInfo.pages[newPagePath] = oldInfo.pages[pagePath]
        newInfo.pages[newPagePath].filePath = newPagePath
        delete oldInfo.pages[pagePath]
        fs.renameSync(pagePath, newPagePath)
    }
    const oldDirs = workspace.getDirs(oldBookName)
    const newDirs = workspace.getDirs(newBookName)
    fs.writeFileSync(path.join(oldDirs.info, 'info.json'), oldInfo.toJson())
    fs.writeFileSync(path.join(newDirs.info, 'info.json'), newInfo.toJson())
}

const getInfo = (sourceIndex, bookName) => {
    const workDirs = workspace.getDirs(bookName)
    const infoPath = path.join(workDirs.info, 'info.json')
    if(fs.existsSync(infoPath)){
        const dict = JSON.parse(fs.readFileSync(infoPath))
        let info = new BookInfo()
        info.fromDict(dict)
        const pages = getPages(sourceIndex, bookName)
        let sortIndex = 0
        let foundNewPage = false
        let newPages = {}
        for(let page of pages){
            if(!info.pages[page]){
                newPages[page] = {
                    filePath: page,
                    sortIndex: sortIndex,
                    hidden: false,
                    selection: null
                }
                foundNewPage = true
            }
            else {
                info.pages[page].sortIndex = sortIndex
                newPages[page] = info.pages[page]
            }
            sortIndex += 1
        }
        info.pages = newPages;
        fs.writeFileSync(infoPath, info.toJson())
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

const setCategory = (sourceIndex, bookName, category) => {
    const workDirs = workspace.getDirs(bookName)
    const info = getInfo(sourceIndex, bookName)
    info.setCategory(category)
    const infoPath = path.join(workDirs.info, 'info.json')
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

const toggleCollate = (sourceIndex, bookName) => {
    const workDirs = workspace.getDirs(bookName)
    const info = getInfo(sourceIndex, bookName)
    info.toggleCollate()
    const infoPath = path.join(workDirs.info, 'info.json')
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

const toggleSkipStitching = (sourceIndex, bookName) => {
    const workDirs = workspace.getDirs(bookName)
    const info = getInfo(sourceIndex, bookName)
    info.toggleSkipStitching()
    const infoPath = path.join(workDirs.info, 'info.json')
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

const toggleSingleRotation = (sourceIndex, bookName) => {
    const workDirs = workspace.getDirs(bookName)
    const info = getInfo(sourceIndex, bookName)
    info.toggleSingleRotation()
    const infoPath = path.join(workDirs.info, 'info.json')
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

const toggleSequentialStitching = (sourceIndex, bookName) => {
    const workDirs = workspace.getDirs(bookName)
    const info = getInfo(sourceIndex, bookName)
    info.toggleSequentialStitching()
    const infoPath = path.join(workDirs.info, 'info.json')
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

const setFirstPageOrientation = (sourceIndex, bookName, orientation) => {
    const workDirs = workspace.getDirs(bookName)
    const info = getInfo(sourceIndex, bookName)
    info.setFirstPageOrientation(orientation)
    const infoPath = path.join(workDirs.info, 'info.json')
    fs.writeFileSync(infoPath, info.toJson())
    return info
}

module.exports = {
    getPages,
    movePages,
    getInfo,
    setSelection,
    setCategory,
    setFirstPageOrientation,
    toggleCollate,
    toggleSequentialStitching,
    toggleSingleRotation,
    toggleSkipStitching

}