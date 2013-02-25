var Holsen = {};
(function(ns){

    ns.ellipsoids = {
        "bessel": {
            "a": 6377492.018,
            "b": 6356173.509
        },
        "international": {
            "a": 6378388.000,
            "b": 6356911.946
    },
        "wgs84": {
            "a": 6378137.000,
            "b": 6356752.314
        }
    };

    var r0 = (180 / Math.PI);

    var toRad = function(deg) {
        return deg / r0;
    };

    var toDeg = function(rad) {
        return  rad / (Math.PI / 180);
    };

    var round = function(number, numDecimals) {
        var pow = Math.pow(10, numDecimals);
        return Math.round(number * pow) / pow;
    };

    var meridbue_constants = function(ellipsoid) {
        var n = (ellipsoid.a - ellipsoid.b) / (ellipsoid.a + ellipsoid.b);
        var k = ellipsoid.a / (n + 1);

        var a1 = n;
        var a2 = Math.pow(n, 2);
        var a3 = Math.pow(n, 3);
        var a4 = Math.pow(n, 4);

        var k1 = 1 + (a2 / 4) + (a4 / 64);
        var k2 = (a1 - a3 * (1 / 8)) * 3;
        var k3 = (a2 - a4/4) * 15 / 8;

        return {
            "n": n,
            "k": k,
            "k1": k1,
            "k2": k2,
            "k3": k3
        };
    };

    var arc = function(b1, b2, constants) {
        var db = b2 - b1;
        var bm = b2 - db / 2;
        var g1 = constants.k * (constants.k1 * db - constants.k2 * Math.cos(2 * bm) * Math.sin(db) + constants.k3 * Math.cos(4 * bm) * Math.sin(2 * db));
        g1 = g1 - constants.k * (Math.pow(constants.n, 3) * Math.cos(6 * bm) * Math.sin(3 * db) * 35/24);
        g1 = g1 + constants.k * (Math.pow(constants.n, 4) * Math.cos(8 * bm) * Math.sin(4 * db) * 315) / 256;
        return g1;
    };

    ns.meridbue = function(ellipsoid, b1, b2) {
        //TODO: implement case for b1 and g given
        return round(arc(toRad(b1), toRad(b2), meridbue_constants(ellipsoid)), 3);
    };

    ns.krrad = function(ellipsoid, br, azimuth) {
        br = toRad(br);
        azimuth = azimuth / r0;
        var e = (Math.pow(ellipsoid.a, 2) - Math.pow(ellipsoid.b, 2)) / Math.pow(ellipsoid.a, 2);
        var m = Math.pow(Math.sin(br), 2);
        m = Math.sqrt(1 - e * m);
        var n = ellipsoid.a / m;
        m = (1 - e) * ellipsoid.a / Math.pow(m, 3);
        var mr = Math.sqrt(m * n);
        var ra = n * m / (n * Math.pow(Math.cos(azimuth), 2) + m * Math.pow(Math.sin(azimuth), 2));
        return {
            "M": round(m, 3),
            "N": round(n, 3),
            "MR": round(mr, 3),
            "AR": round(ra, 3)
        };
    };

    var vinkeltr = function(a, b, v) {
        return Math.atan(a * Math.tan(v) / b);
    };

    var vinkel = function(t, n) {

        if(Math.abs(t) < 5 * Math.pow(10, -9)) {
            if(n > 0) {
                return 0;
            } else if (n < 0) {
                return Math.PI;
            }
        } else if (Math.abs(n) < 5 * Math.pow(10, -9)) {
            if(t > 0) {
                return Math.PI / 2;
            } else if(t < 0 ) {
                return 1.5 * Math.PI;
            }
        }

        var a1 = Math.atan(t / n);
        if(t > 0 && n > 0) {
            return a1;
        } else if(t > 0 && n !== 0) {
            return a1 + Math.PI;
        } else {
            return a1 + Math.PI * 2;
        }
    };

    var avstand = function(c, d1, d2, d3, si) {
        return c * (si + d1 * Math.sin(2 * si) - d2 * Math.sin(4 * si) + d3 * Math.sin(6 * si));
    };

    ns.lgeo1 = function(ellipsoid, lat, lon, length, azimuth) {
        lat = toRad(lat);
        lon = toRad(lon);
        azimuth = toRad(azimuth);

        var rb1 = vinkeltr(ellipsoid.b, ellipsoid.a, lat);
        var si1 = vinkel(-Math.cos(azimuth), Math.tan(rb1));

        var rb0 = vinkel(1, -Math.sin(si1) * Math.tan(azimuth));
        if(azimuth > Math.PI) {
            rb0 = Math.PI - rb0;
        }

        var la1 = vinkel(Math.tan(si1), Math.cos(rb0));
        var b0 = vinkeltr(ellipsoid.a, ellipsoid.b, rb0);
        var e = (ellipsoid.a - ellipsoid.b) * (ellipsoid.a + ellipsoid.b) / Math.pow(ellipsoid.a, 2);
        var w0 = Math.sqrt(1 - e * (Math.pow(Math.sin(b0), 2)));
        var k1 = (1 - w0) / (1 + w0);
        var c = ellipsoid.b * (1 + Math.pow(k1, 2) / 4) / (1 - k1);
        var d1 = (k1 / 2 - (3 * Math.pow(k1, 3))/ 16);
        var d2 = Math.pow(k1, 2) / 16;
        var d3 = Math.pow(k1, 3) / 48;
        var s1 = avstand(c, d1, d2, d3, si1);
        var s2 = s1 + length;
        var si2 = 0;
        var s3 = 0;

        var f = 0;
        var ds0;
        while (f < 5) {
            ds0 = s2 - s3;
            si2 = si2 + ds0 / c;
            f = f + 1;
            s3 = avstand(c, d1, d2, d3, si2);
        }

        var la2 = vinkel(Math.tan(si2), Math.cos(rb0));
        var a2 = vinkel(1, Math.sin(si2) * Math.tan(rb0));
        var rb2 = vinkel(Math.cos(a2), Math.tan(si2));

        var b2 = vinkeltr(ellipsoid.a, ellipsoid.b, rb2);

        if(b2 < 0) {
            la2 = la2 - Math.PI;
        } else if(lat < 0) {
            la2 = la2 + Math.PI;
        }
        if(la2 < la1) {
            la2 = la2 + 2 * Math.PI;
        }
        var dla = la2 - la1;
        var dsi = si2 - si1;
        var n1 = (ellipsoid.a - ellipsoid.b) / (ellipsoid.a + ellipsoid.b);
        var r = e * Math.cos(rb0) / 2;
        var r1 = (1 + n1 - k1 / 2 - Math.pow(k1, 2) / 4);
        var r2 = k1 / 4;
        var r3 = Math.pow(k1, 2) / 16;
        var dl = dla - r *(r1 * dsi - r2 *(Math.sin(2 * s1) - Math.sin(2 * si1)));
        dl = dl - r * r3 * (Math.sin(4 * si2) - Math.sin(4 * si1));
        if(dl > Math.PI * 2) {
            dl = dl - Math.PI * 2;
        }

        var l2;
        if(azimuth > Math.PI) {
            l2 = lat - dl;
        } else {
            l2 = lat + dl;
        }

        if(l2 > 2 * Math.PI) {
            l2 = l2 - 2 * Math.PI;
        }

        if(azimuth < Math.PI) {
            a2 = 2 * Math.PI - a2;
        }

        if(lon < 0 && b2 < 0 && azimuth < Math.PI){
            l2 = l2 - Math.PI;
        }

        if(lon < 0 && b2 < 0 && azimuth > Math.PI) {
            l2 = l2 + Math.PI;
        }

        if(l2 > Math.PI) {
            l2 = l2 - 2 * Math.PI;
        } else if(l2 < Math.PI) {
            l2 = l2 + 2 * Math.PI;
        }

        rb0 = toDeg(rb0);
        si1 = toDeg(si1);
        si2 = toDeg(si2);
        la1 = toDeg(la1);
        la2 = toDeg(la2);

        console.log(rb0);
        console.log(si1, si2);
        console.log(la1, la2);

        b2 = toDeg(b2);
        l2 = toDeg(l2);
        a2 = toDeg(a2);
        return {
            "B2": round(b2, 9),
            "L2": round(l2, 9),
            "A2": round(a2, 9)
        };
    };

}(Holsen));