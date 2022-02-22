export default class Color {
  constructor(r=0, g=0, b=0, a=1) {
    //make sure rgba values are within valid ranges
    for(var i = 0; i < 3; i++) {
      if(arguments[i] < 0 || arguments[i] > 255) {
        throw "One or more RGB values are outside of [0, 255]";
      }
    }
    if(arguments[3] < 0 || arguments[3] > 1) {
      throw "Transparency value is outside of [0, 1]"
    }

    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  //getter methods
  get hex() {
    var rHex = this.#componentToHex(this.r);
    var gHex = this.#componentToHex(this.g);
    var bHex = this.#componentToHex(this.b);
    return "#" + rHex + gHex + bHex;
  }
  rgba(a=this.a) {
    return "rgba(" + this.r + "," + this.g + "," + this.b + "," + a + ")";
  }

  //cast object to Color object
  static cast(object) {
    return new Color(object.r | 0, object.g | 0, object.b | 0, object.a | 1);
  }

  //cast array of objects to array of Color objects
  static castArray(array) {
    var colorArray = [];
    array.forEach(color => {
      colorArray.push(Color.cast(color));
    });
    return colorArray;
  }

  //get text color based on background color
  static textColor(bgColor, transparency=1) {
    if ((bgColor.r * 0.299 + bgColor.g * 0.587 + bgColor.b * 0.114) > 171) {
      return new Color(0, 0, 0, transparency);
    } else {
      return new Color(255, 255, 255, transparency);
    }
  }

  //parse hex to Color object
  static parseHex(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? new Color(
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ) : null;
  }

  //gets the average color given an array of colors
  static averageColors(colorArray) {
    var avgR = 0;
    var avgG = 0;
    var avgB = 0;
    var avgA = 0;

    colorArray.forEach(color => {
      avgR += color.r;
      avgG += color.g;
      avgB += color.b;
      avgA += color.a;
    });

    avgR /= colorArray.length;
    avgG /= colorArray.length;
    avgB /= colorArray.length;
    avgA /= colorArray.length;

    return new Color(avgR, avgG, avgB, avgA);
  }

  //convert a single color component (0 to 99) to its hexadecimal value
  #componentToHex(comp) {
    var hex = comp.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  //to string returns rgba value
  toString() {
    return this.rgba();
  }
}
