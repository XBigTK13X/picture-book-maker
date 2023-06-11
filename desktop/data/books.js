
const util = require('../../common/util')
const _ = require('lodash')
const path = require('path')
const sources = require('./sources')

const getList = (sourceIndex)=>{
    const sourcePath = sources.getByIndex(sourceIndex)

    let pagePaths = util.getFiles(sourcePath)
    let books = {}
    for(let page of pagePaths){
        const book = path.basename(path.dirname(page))
        if(!_.has(books, book)){
            books[book] = true
        }
    }
    return Object.keys(books)
}

module.exports = {
    getList
}