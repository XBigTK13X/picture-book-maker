module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const query = util.queryParams()
        const book = require('../data/book')

        const pages = book.getPages(query.sourceIndex, query.bookName)


        let markup = pages.map((page)=>{
            return `
                <a href="page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${page}" class="page-list-item-wrapper">
                <img class="page-list-item" class="scanned-page" src="file://${page}" />
                <a/>
            `
        }).join('')

        document.getElementById('pages-list').innerHTML = markup
        document.getElementById('header').innerHTML = `Book - ${query.bookName}`

        resolve()
    })
}
