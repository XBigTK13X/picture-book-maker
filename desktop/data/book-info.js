const _ = require('lodash')
class BookInfo {
    constructor(bookName){
        this.bookName = bookName
        this.pages = {}
        this.firstPageOrientation = 'up'
        this.category = 'Unsorted'
    }

    fromDict(dict){
        this.bookName = dict.bookName
        this.pages = dict.pages
        this.firstPageOrientation = dict.firstPageOrientation
        this.category = dict.category
    }

    toJson(){
        return JSON.stringify({
            bookName: this.bookName,
            pages: this.pages,
            firstPageOrientation: this.firstPageOrientation,
            category: this.category
        }, null, 4)
    }

    setSelection(pagePath, selection){
        const pageKey = pagePath.replaceAll("\\\\","\\")
        this.pages[pageKey].selection = selection
        if(selection.length === 4){
            for(let page of Object.keys(this.pages)){
                if(!this.pages[page].selection){
                    this.pages[page].selection = selection
                }
            }
        }
    }

    getSelection(pagePath){
        return this.pages[pagePath].selection
    }

    setCategory(category){
        this.category = category
    }

    getReverseIndex(){
        return Math.floor(Object.keys(this.pages).length / 2) - 1
    }
}

module.exports = BookInfo