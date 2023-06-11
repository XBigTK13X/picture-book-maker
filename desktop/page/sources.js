module.exports = () => {
    return new Promise((resolve, reject) => {
        const settings = require('../../common/settings')
        const sources = require('../data/sources')

        let markup = sources.getList().map((directoryPath, index)=>{
            return `

                <a href="books.html?sourceIndex=${index}">
                    <div class="wide-link">
                        ${directoryPath}
                    </div>
                </a>


            `
        }).join('')

        document.getElementById('sources-list').innerHTML = markup
        document.getElementById('header').innerHTML = 'Sources'

        resolve()
    })
}
