import P5 from "P5";

export enum Channel {
    Red,
    Green,
    Blue,
}

export class Matrix {
    public r: number;
    public c: number;
    private kernel: number[];

    constructor(r: number, c: number) {
        this.r = r;
        this.c = c
        this.kernel = Array(c * r).fill(0);
    }

    checkBounds(r: number, c: number): void {
        if (r >= this.r || c >= this.c) {
            throw Error("Out of bounds");
        }
    }

    index(c: number, r: number): number {
        this.checkBounds(c, r);
        return c + r * this.c;
    }

    at(r: number, c: number): number {
        return this.kernel[this.index(r, c)];
    }

    set(r: number, c: number, val: number): void {
        this.kernel[this.index(r, c)] = val;
    }

    getValues(): number[] {
        return this.kernel;
    }

    setValues(values: number[]): void {
        if (values.length !== this.kernel.length) {
            throw Error("Values' lengths don't match");
        }
        this.kernel = values;
    }

    getModulo(): number {
        return this.kernel.reduce((prev, curr) => prev + curr);
    }

    scale(factor: number): Matrix {
        this.kernel = this.kernel.map(n => n * factor);
        return this;
    }

    add(other: Matrix): Matrix {
        if (this.r != other.r || this.c != other.c) {
            throw Error("Matrix dimensions for addition do not match");
        }
        const otherVals = other.getValues() 
        this.kernel = this.kernel.map((n, i) => n + otherVals[i]);
        return this;
    }
}

export class Picture {
    private red: Matrix;
    private green: Matrix;
    private blue: Matrix;

    static fromP5Image(image: P5.Image): Picture {
        return new Picture(image.pixels, image.height, image.width);
    }

    constructor(pixels: number[] | { red: Matrix, green: Matrix, blue: Matrix }, r?: number, c?: number) {
        if (Array.isArray(pixels)) {
            this.red = new Matrix(r, c);
            this.green = new Matrix(r, c);
            this.blue = new Matrix(r, c);

            for (let ic = 0; ic < c; ic++) {
                for (let ir = 0; ir < r; ir++) {
                    const iPixels = 4 * (ic + ir * c);
                    const red = pixels[iPixels];
                    const green = pixels[iPixels + 1];
                    const blue = pixels[iPixels + 2];
                    // const alpha = pixels[iPixels + 3];

                    this.red.set(ir, ic, red);
                    this.green.set(ir, ic, green);
                    this.blue.set(ir, ic, blue);
                }
            }
        } else {
            if (
                pixels.red.r !== pixels.green.r || pixels.green.r !== pixels.blue.r ||
                pixels.red.c !== pixels.green.c || pixels.green.c !== pixels.blue.c
            ) {
                throw Error("Picture pixel matrices do not have the same sizes");
            }
            this.red = pixels.red;
            this.green = pixels.green;
            this.blue = pixels.blue;
        }
    }
    
    get r(): number {
        if (this.red.r !== this.green.r || this.green.r !== this.blue.r) {
            throw Error("Mismatching rows in picture");
        }
        return this.red.r;
    }
    
    get c(): number {
        if (this.red.c !== this.green.c || this.green.r !== this.blue.c) {
            throw Error("Mismatching columns in picture");
        }
        return this.red.c;
    }

    at(r: number, c: number): number[] {
        return [
            this.red.at(r, c),
            this.green.at(r, c),
            this.blue.at(r, c),
        ];
    }

    getChannel(channel: Channel): Matrix {
        return [this.red, this.green, this.blue][channel];
    }
}

export class Convolutor {
    private matrix: Matrix;

    constructor(n: number) {
        if (n % 2 == 0) {
            throw Error("Convolutor n must be an odd number");
        }
        this.matrix = new Matrix(n, n);
    }

    get n(): number {
        if (this.matrix.r != this.matrix.c) {
            throw Error("Convolutor matrix not square");
        }
        return this.matrix.r;
    }

    at(r: number, c: number): number {
        return this.matrix.at(r, c);
    }

    getValues(): number[] {
        return this.matrix.getValues();
    }

    setValues(values: number[]): void {
        this.matrix.setValues(values);
    }

    randomize(): void {
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                this.matrix.set(i, j, Math.random());
            }
        }
    }

    convolve1(matrix: Matrix, r: number, c: number): number {
        let result = 0;
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                result += this.at(i, j) * matrix.at(r+i, c+j);
            }
        }
        const mod = this.matrix.getModulo();
        return result / mod;
    }

    convolve2d(matrix: Matrix): Matrix {
        const result = new Matrix(matrix.r - this.n, matrix.c - this.n)
        for (let i = 0; i < result.r; i++) {
            for (let j = 0; j < result.c; j++) {
                result.set(i, j, this.convolve1(matrix, i, j));
            }
        }
        return result;
    }

    deconvolve1(val: number, r: number, c: number): number {
        const mod = this.matrix.getModulo();
        return this.matrix.at(r, c) * val / mod;
    }

    deconvolve2d(matrix: Matrix): Matrix {
        const result = new Matrix(matrix.r * this.n, matrix.c * this.n);
        for (let i = 0; i < matrix.r; i++) {
            for (let j = 0; j < matrix.c; j++) {
                for (let ii = 0; ii < this.n; ii++) {
                    for (let jj = 0; jj < this.n; jj++) {
                        const val = matrix.at(i, j);
                        const conVal = this.deconvolve1(val, ii, jj);
                        result.set(i * this.n + ii, jj * this.n + jj, conVal);
                    }
                }
            }
        }
        return result;
    }
}

export interface WeightedColoredConvolutor {
    fromRed: Convolutor;
    fromGreen: Convolutor;
    fromBlue: Convolutor;
    weights: number[];
}

function makeWeightedColoredConvolutor(n: number): WeightedColoredConvolutor {
    return {
        fromRed: new Convolutor(n),
        fromGreen: new Convolutor(n),
        fromBlue: new Convolutor(n),
        weights: new Array(3).fill(1),
    };
}

export class PictureConvolutor {
    public n: number;
    private toRed: WeightedColoredConvolutor;
    private toGreen: WeightedColoredConvolutor;
    private toBlue: WeightedColoredConvolutor;

    constructor(n: number) {
        this.n = n;
        this.toRed = makeWeightedColoredConvolutor(n);
        this.toGreen = makeWeightedColoredConvolutor(n);
        this.toBlue = makeWeightedColoredConvolutor(n);
    }

    getWeightedColoredConvolutor(channel: Channel): WeightedColoredConvolutor {
        return [this.toRed, this.toGreen, this.toBlue][channel];
    }

    randomizeChannel(channel: Channel): void {
        const weightedColoredConvolutor = this.getWeightedColoredConvolutor(channel);
        weightedColoredConvolutor.fromRed.randomize();
        weightedColoredConvolutor.fromGreen.randomize();
        weightedColoredConvolutor.fromBlue.randomize();
        weightedColoredConvolutor.weights.map(() => Math.random());
    }

    randomize(): void {
        this.randomizeChannel(Channel.Red);
        this.randomizeChannel(Channel.Green);
        this.randomizeChannel(Channel.Blue);
    }

    getConvolutor(fromChannel: Channel, toChannel: Channel) {
        const to = this.getWeightedColoredConvolutor(toChannel);
        return [to.fromRed, to.fromGreen, to.fromBlue][fromChannel];
    }

    getWeights(toChannel: Channel): number[] {
        return this.getWeightedColoredConvolutor(toChannel).weights;
    }

    getWeight(fromChannel: Channel, toChannel: Channel) {
        return this.getWeights(toChannel)[fromChannel];
    }

    getWeightSum(toChannel: Channel): number {
        return this.getWeights(toChannel).reduce((prev, curr) => prev + curr);
    }

    convolvePartial(fromChannel: Channel, toChannel: Channel, picture: Picture): Matrix {
        const convolutor = this.getConvolutor(fromChannel, toChannel);
        return convolutor.convolve2d(picture.getChannel(fromChannel))
            .scale(this.getWeight(fromChannel, toChannel));
    }

    convolveChannel(toChannel: Channel, picture: Picture): Matrix {
        const convRed = this.convolvePartial(Channel.Red, toChannel, picture);
        const convGreen = this.convolvePartial(Channel.Green, toChannel, picture);
        const convBlue = this.convolvePartial(Channel.Blue, toChannel, picture);

        return convRed
            .add(convGreen)
            .add(convBlue)
            .scale(this.getWeightSum(toChannel));
    }

    convolvePicture(picture: Picture): Picture {
        return new Picture({
            red: this.convolveChannel(Channel.Red, picture),
            green: this.convolveChannel(Channel.Green, picture),
            blue: this.convolveChannel(Channel.Blue, picture),
        });
    }

    deconvolvePartial(fromChannel: Channel, toChannel: Channel, picture: Picture): Matrix {
        const convolutor = this.getConvolutor(fromChannel, toChannel);
        return convolutor.deconvolve2d(picture.getChannel(fromChannel))
            .scale(this.getWeight(fromChannel, toChannel));
    }

    deconvolveChannel(toChannel: Channel, picture: Picture): Matrix {
        const deconvRed = this.deconvolvePartial(Channel.Red, toChannel, picture);
        const deconvGreen = this.deconvolvePartial(Channel.Green, toChannel, picture);
        const deconvBlue = this.deconvolvePartial(Channel.Blue, toChannel, picture);

        return deconvRed
            .add(deconvGreen)
            .add(deconvBlue)
            .scale(this.getWeightSum(toChannel));
    }

    deconvolvePicture(picture: Picture): Picture {
        return new Picture({
            red: this.deconvolveChannel(Channel.Red, picture),
            green: this.deconvolveChannel(Channel.Green, picture),
            blue: this.deconvolveChannel(Channel.Blue, picture),
        });
    }
}

export class ECNN {}
