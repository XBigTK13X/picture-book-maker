const sources = require('./sources')
const path = require('path')
const util = require('../../common/util')
const settings = require('../../common/settings')

const getPages = (sourceIndex, bookName)=>{
    const sourcePath = sources.getByIndex(sourceIndex)

    let pagePaths = util.getFiles(sourcePath)
    let pages = []
    for(let page of pagePaths){
        const book = path.basename(path.dirname(page))
        if(book == bookName){
            pages.push(page)
        }
    }
    return pages
}

module.exports = {
    getPages
}