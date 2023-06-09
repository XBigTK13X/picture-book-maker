
const util = require('../../common/util')
const _ = require('lodash')
const path = require('path')
const sources = require('./sources')

const getList = (sourceIndex)=>{
    const sourcePath = sources.getByIndex(sourceIndex)

    let pagePaths = util.getFiles(sourcePath)
    let books = {}
    for(let page of pagePaths){
        if(
            page.indexOf('.jpeg') !== -1 ||
            page.indexOf('.jpg') !== -1 ||
            page.indexOf('.png') !== -1
        ){
            let book = page.replace(sourcePath+"\\", "").replace("\\"+path.basename(page),"")
            if(book.indexOf("\\") === -1 && !_.has(books, book)){
                books[book] = true
            }
        }
    }
    return Object.keys(books)
}

module.exports = {
    getList
}