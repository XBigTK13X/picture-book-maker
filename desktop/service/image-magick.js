const spawn = require('child_process').spawn
const util = require('../../common/util')
const settings = require('../../common/settings')
const path = require('path')

let binPath = null

class Coordinates{
    constructor(){
        this.topLeft = {
            x: 0,
            y: 0
        }
        this.topRight = {
            x: 0,
            y: 0
        }
        this.bottomRight = {
            x: 0,
            y: 0
        }
        this.bottomLeft = {
            x: 0,
            y: 0
        }
    }
    setTopLeft(x, y){
        this.topLeft = {
            x, y
        }
    }
    setTopRight(x, y){
        this.topRight = {
            x, y
        }
    }
    setBottomRight(x, y){
        this.bottomRight = {
            x, y
        }
    }
    setBottomLeft(x, y){
        this.bottomLeft = {
            x, y
        }
    }
    fromXYPairs(pairs){
        if(pairs.length === 4){
            pairs.sort((a,b)=>{
                return a.x - b.x
            })
            let left1 = pairs[0]
            let left2 = pairs[1]
            if(left2.y < left1.y){
                let temp = left1
                left1 = left2
                left2 = temp
            }
            let right1 = pairs[2]
            let right2 = pairs[3]
            if(right2.y < right1.y){
                let temp = right1
                right1 = right2
                right2 = temp
            }
            this.setTopLeft(left1.x, left1.y)
            this.setBottomLeft(left2.x, left2.y)
            this.setTopRight(right1.x, right1.y)
            this.setBottomRight(right2.x, right2.y)

        }
    }
    width(){
        return this.topRight.x - this.topLeft.x
    }

    height(){
        return this.bottomLeft.y - this.topLeft.y
    }
}

const distortAndCrop = (sourceImagePath, selectionCoordinates, cropCoordinates) => {
    util.serverLog('imageMagick - Running distort and crop')
    if(!binPath){
        binPath = path.join(settings.imageMagickDir,'magick.exe')
    }
    const convertedPath = sourceImagePath + '.converted.png'
    if(!cropCoordinates){
        cropCoordinates = new Coordinates()
        // Choose a rentangle inside the lowest value of each bounding box
        let lowX = selectionCoordinates.topLeft.x > selectionCoordinates.bottomLeft.x ? selectionCoordinates.topLeft.x : selectionCoordinates.bottomLeft.x
        let lowY = selectionCoordinates.topLeft.y > selectionCoordinates.topRight.y ? selectionCoordinates.topLeft.y : selectionCoordinates.topRight.y
        let highX = selectionCoordinates.topRight.x < selectionCoordinates.bottomRight.x ? selectionCoordinates.topRight.x : selectionCoordinates.bottomRight.x
        let highY = selectionCoordinates.bottomLeft.y < selectionCoordinates.bottomRight.y ? selectionCoordinates.bottomLeft.y : selectionCoordinates.bottomRight.y
        cropCoordinates.setTopLeft(lowX, lowY)
        cropCoordinates.setTopRight(highX, lowY)
        cropCoordinates.setBottomRight(highX, highY)
        cropCoordinates.setBottomLeft(lowX, highY)
    }
    /* Attempted to use distort for a better fit, but it runs way too slow
    // https://stackoverflow.com/questions/50149907/imagemagick-skew-image-with-4-x-y-coordinates
    const transform_coordinates = [
        selectionCoordinates.topLeft.x,
        selectionCoordinates.topLeft.y,
        cropCoordinates.topLeft.x,
        cropCoordinates.topLeft.y,
        selectionCoordinates.topRight.x,
        selectionCoordinates.topRight.y,
        cropCoordinates.topRight.x,
        cropCoordinates.topRight.y,
        selectionCoordinates.bottomRight.x,
        selectionCoordinates.bottomRight.y,
        cropCoordinates.bottomRight.x,
        cropCoordinates.bottomRight.y,
        selectionCoordinates.bottomLeft.x,
        selectionCoordinates.bottomLeft.y,
        cropCoordinates.bottomLeft.x,
        cropCoordinates.bottomLeft.y,
    ]
    */
   console.log({
    width: cropCoordinates.width(),
    height: cropCoordinates.height()
   })
    const args = [
        'convert',
        `${sourceImagePath}`,
        '-crop',
        `${cropCoordinates.width()}x${cropCoordinates.height()}+${cropCoordinates.topLeft.x}+${cropCoordinates.topLeft.y}`,
        `${convertedPath}`
    ]
    console.log(args.join(', '))
    const magick = spawn(binPath, args, { stdio: 'ignore' })
    magick.on('exit', (code)=>{
        console.log(`ImageMagick finished with code [${code}]`)
    })
}

module.exports = {
    distortAndCrop,
    Coordinates
}