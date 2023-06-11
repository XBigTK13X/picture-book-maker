const settings = require('../../common/settings')

const getList = ()=>{
    return settings.sourceDirectories
}

const getByIndex = (index)=>{
    return settings.sourceDirectories[index]
}

module.exports = {
    getList,
    getByIndex
}