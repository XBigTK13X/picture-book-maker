module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const query = util.queryParams()
        const books = require('../data/books')

        const bookList = books.getList(query.sourceIndex)

        let markup = bookList.map((bookName)=>{
            return `
                <a href="book.html?sourceIndex=${query.sourceIndex}&bookName=${bookName}">
                <div class="wide-link">
                        ${bookName}
                        </div>
                </a>
            `
        }).join('')

        document.getElementById('books-list').innerHTML = markup
        document.getElementById('header').innerHTML = `Books (${bookList.length})`

        resolve()
    })
}
