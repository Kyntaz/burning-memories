import P5 from "p5";

function sketch(p: P5) {
    p.setup = () => {
        p.createCanvas(400, 400);
    }

    p.draw = () => {
        p.background(0);
        p.rect(100, 100, 200, 200);
    }
}

new P5(sketch);