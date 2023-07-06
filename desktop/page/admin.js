module.exports = () => {
    return new Promise((resolve, reject) => {
        $('#rearchive-action').on('click', (jQEvent)=>{
            require('electron').ipcRenderer.send(
                'pbm-regenerate-archives'
            )
        })

        resolve()
    })
}
