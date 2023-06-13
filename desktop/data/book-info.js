const _ = require('lodash')
class BookInfo {
    constructor(bookName){
        this.bookName = bookName
        this.pages = {}
        this.firstPageOrientation = 'up'
        this.reverseIndex = 0
    }

    fromDict(dict){
        this.bookName = dict.bookName
        this.pages = dict.pages
        this.firstPageOrientation = dict.firstPageOrientation
        this.reverseIndex = dict.reverseIndex
    }

    toJson(){
        return JSON.stringify({
            bookName: this.bookName,
            pages: this.pages,
            firstPageOrientation: this.firstPageOrientation,
            reverseIndex: this.reverseIndex
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
}

module.exports = BookInfo