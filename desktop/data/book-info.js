const _ = require('lodash')
class BookInfo {
    constructor(bookName){
        this.bookName = bookName
        this.pages = {}
        this.firstPageOrientation = 'up'
        this.category = 'Unsorted'
        this.collateBackwards = false
        this.skipStitching = false
        this.sequentialStitching = false
    }

    fromDict(dict){
        this.bookName = dict.bookName
        this.pages = dict.pages
        this.firstPageOrientation = dict.firstPageOrientation
        this.category = dict.category
        this.collateBackwards = dict.collateBackwards
        this.skipStitching = dict.skipStitching
        this.sequentialStitching = dict.sequentialStitching
    }

    toJson(){
        return JSON.stringify({
            bookName: this.bookName,
            pages: this.pages,
            firstPageOrientation: this.firstPageOrientation,
            category: this.category,
            collateBackwards: this.collateBackwards,
            skipStitching: this.skipStitching,
            sequentialStitching: this.sequentialStitching
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
        if(!this.pages[pagePath]){
            return null
        }
        return this.pages[pagePath].selection
    }

    setCategory(category){
        this.category = category
    }

    getReverseIndex(){
        return Math.floor(Object.keys(this.pages).length / 2)
    }

    toggleCollate(){
        this.collateBackwards = !this.collateBackwards
    }

    getPage(pagePath){
        const pageKey = pagePath.replaceAll("\\\\","\\")
        return this.pages[pageKey]
    }

    getKeys(){
        let keys = Object.keys(this.pages)
        keys.sort()
        return keys
    }
}

module.exports = BookInfo