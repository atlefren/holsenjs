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

    var toRad = function(deg) {
        var r0 = 180 / Math.PI;
        return deg / r0;
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
        return round(arc(toRad(b1), toRad(b2), meridbue_constants(ellipsoid)), 3);
    };

    ns.krrad = function(ellipsoid, br, azimuth) {
        br = toRad(br);
        azimuth = azimuth / (180 / Math.PI);
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

}(Holsen));