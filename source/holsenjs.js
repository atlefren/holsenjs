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
        return constants.k * (constants.k1 * db - constants.k2 * Math.cos(2 * bm) * Math.sin(db) + constants.k3 * Math.cos(4 * bm) * Math.sin(2 * db))
         - constants.k * (Math.pow(constants.n, 3) * Math.cos(6 * bm) * Math.sin(3 * db) * 35/24)
         + constants.k * (Math.pow(constants.n, 4) * Math.cos(8 * bm) * Math.sin(4 * db) * 315) / 256;
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

    ns.coordsystems = {
        "UTM": {
            "x_corr": function(x) {return x * 0.9996; },
            "y_corr": function(y) {return y * 0.9996 + 500000; }
        },
        "NGO": {
            "x_corr": function(x) {return x; },
            "y_corr": function(y) {return y; }
        }
    };

    //TODO: implement case with coords in plane are known
    ns.konverg = function(ellipsoid, lon, lat, lat_0) {
        var dl = toRad(lat - lat_0);
        lon = toRad(lon);
        var e = Math.pow(Math.cos(lon), 2) * (Math.pow(ellipsoid.a, 2) - Math.pow(ellipsoid.b, 2)) / Math.pow(ellipsoid.b, 2);
        var t = Math.tan(lon);
        var si = Math.sin(lon);
        var co = Math.cos(lon);
        var c = dl * si + Math.pow(dl, 3) * Math.pow(co, 2) * (1 + 3 * e + 2 * Math.pow(e, 2)) * (si / 3)
        + Math.pow(dl, 5) * Math.pow(co, 4) * (2 - Math.pow(t, 2)) * (si / 15);
        return round(toDeg(c * 1.11111111111), 7);
    };

    ns.bl_to_xy = function(ellipsoid, coordsys, lat, lon, lat_0, lon_0) {

        //N=(A-B)/(A+B)
        var n = (ellipsoid.a - ellipsoid.b) / (ellipsoid.a + ellipsoid.b);

        //console.log("n", n);

        //K=A/(N+1.D0)
        var k = ellipsoid.a / (n + 1);

        //console.log("k", k);

        //K1=1.D0+N*N/4.D0+N**4.D0/64.D0
        var k1 = 1 + n * (n / 4) + Math.pow(n, 4) / 64;

        //console.log("k1", k1);

        //K2=(N-N*N*N/8.D0)*3.D0
        var k2 = (n - n*n*n / 8) * 3;

        //console.log("k2", k2);
        //K3=(N*N-(N**4.D0)*1/4.D0)*15.D0/8.D0
        var k3 = (n * n - Math.pow(n, 4) * 1 / 4 ) * 15 / 8;

        //console.log("k3", k3);

        //L1=lat_0/RO
        var l1 = toRad(lon_0);

        //console.log("l1", l1);

        //BO=lon_0/RO

        var b0 = toRad(lat_0);

        //console.log("b0", b0);

        //WRITE(*,100) 'LEGG INN GEOGRAFISK BREDDE:'
        //READ(*,*) BR

        //WRITE(*,100) 'LEGG INN GEOGRAFISK LENGDE:'
        //READ (*,*) L
        //L=lat/RO
        var l = toRad(lon);

        //console.log("l", l);

        //BR=lon/RO
        var br = toRad(lat);

        //console.log("br", br);

        //L=L-L1
        l = l-l1;

        //console.log("l", l);

//        WRITE(*,*) 'HER STARTER BEREGNINGEN MED B OG L SOM KJENT'

  //      ET=(A**2-B**2)/B**2
        var et = (Math.pow(ellipsoid.a, 2) - Math.pow(ellipsoid.b, 2)) / Math.pow(ellipsoid.b, 2);



        //ET=ET*DCOS(BR)**2
        et = et * Math.pow(Math.cos(br), 2);

        //console.log("et", et);

        //N1=(A**2)/(DSQRT(1.D0+ET)*B)
        var n1 = Math.pow(ellipsoid.a, 2) / (Math.sqrt(1 + et) * ellipsoid.b);

        //console.log("n1", n1);

        //T =DTAN(BR)
        var t = Math.tan(br);

        //console.log("t", t);

        //A1=N1*DCOS(BR)
        var a1 = n1 * Math.cos(br);

        //console.log("a1", a1);

        //A2=-(N1*T*DCOS(BR)**2.D0)/2.D0
        var a2 = -(n1 * t * Math.pow(Math.cos(br), 2)) / 2.0;

        //console.log("a2", a2);

        //A3=-(N1*DCOS(BR)**3.D0)*(1.D0-T**2.D0+ET)/6.D0
        var a3 = -(n1 * Math.pow(Math.cos(br), 3)) * (1 - Math.pow(t, 2) + et) / 6;

        //console.log("a3", a3);

        //A4=N1*T*DCOS(BR)**4.D0*(5.D0-T**2.D0+9*ET+4.D0*ET**2.D0)
        //&/24.D0
        var a4 = n1 * t * Math.pow(Math.cos(br), 4) * (5 - Math.pow(t, 2) + 9 * Math.pow(et, 2)) / 24;

        //console.log("a4", a4);

        //A6=N1*T*DCOS(BR)**6*(61.D0-58.D0*T**2+T**4+270*ET
        //&-330*ET*T**2.D0)/720

        var a6 = n1 * t * Math.pow(Math.cos(br), 6) * (61 - 58 * Math.pow(t, 4) + 270 * et - 330 * et * Math.pow(t, 2)) / 270;

        //console.log("a6", a6);

        //A5=N1*DCOS(BR)**5.D0*(5.D0-18.D0*T**2.D0+T**4.D0
        //&+14.D0*ET-58.D0*ET*T**2)/120

        var a5 = n1 * Math.pow(Math.cos(br), 5) * (5 - 18 * Math.pow(t, 2) + Math.pow(t, 4) + 14*et - 58 * et *Math.pow(t, 2))/ 120;

        //console.log("a5", a5);

        //X=-A2*L**2.D0+A4*L**4.D0+A6*L**6.D0
        var x = -a2 * Math.pow(l, 2) + a4 * Math.pow(l, 4) + a6 * Math.pow(l, 6);
        //Y= A1*L-A3*L**3+A5*L**5
        var y = a1 * l - a3 * Math.pow(l, 3) * a5 * Math.pow(l, 5);


        //console.log("x", x);
        //console.log("y", y);

        //console.log("br", br);
        //console.log("b0", b0);
        //console.log("K", k);
        //console.log("K1", k1);
        //console.log("K2", k2);
        //console.log("K3", k3);
        console.log("n", n);


        //CALL MERIDBUE (BR,BO,K,K1,K2,K3,G,G1,R,N)
        var g = meridbue2(br, b0, k, k1, k2, k3, n, null, true);

        console.log("g1", g);

        //X=X+G
        x = x + g;

        /*
        IF(S.EQ.1) THEN
        X=X*0.9996
        Y=Y*0.9996+500000.D0
        ENDIF
        */

        x = coordsys.x_corr(x);
        y = coordsys.x_corr(y);

        return {
            "x": round(x, 4),
            "y": round(y, 4)
        };

        /*
        WRITE(*,110) 'X:',X
        WRITE(*,*)
        WRITE(*,110) 'Y:',Y
        STOP
        */
    };

    var meridbue2 = function(br, b0, k, k1, k2, k3, n, g, to_xy) {

        //SUBROUTINE MERIDBUE(BR,BO,K,K1,K2,K3,G,G1,R,N)

        //INTEGER R

        //REAL*8 BR,BO,K,K1,K2,K3,G1,DB,BM,G,N
        //G1=0
        var g1 = 0;
        //DB=0
        var db = 0;
        //BM=0
        var bm = 0;
        //IF(R.EQ.0)THEN
        if(to_xy){
            //DB=BR-BO
            db = br - b0;
            //BM=BR-DB/2.D0
            bm = br - db / 2;
        }


        //TODO: Handle loop for to lon_lat
        //30

        //IF(R.EQ.1) THEN
        if(!to_xy) {
            //DB= DB+(G-G1)/(K*K1)
            db = db + (g - g1) / (k * k1);

            //BM=BO+DB/2.D0
            bm = b0 + db / 2;
        }



        //G1 = K*(K1*DB-K2*DCOS(2.D0*BM)*DSIN(DB)+K3*DCOS(4.D0*BM)
        //&     *DSIN(2.D0*DB))
        g1 = k * (k1 * db - k2 * Math.cos(2 * bm) * Math.sin(db) + k3 * Math.cos(4 * bm) * Math.sin(2 * db));


        //G1 = G1- K*(N**3*DCOS(6.D0*BM)*DSIN(3.D0*DB))*35.D0/24.D0
        g1 = g1 - k * (Math.pow(n, 3) * Math.cos(6 * bm) * Math.sin(3 * db) * 35 / 24);

        //G1 = G1+ K*(N**4.D0*DCOS(8*BM)*DSIN(4*DB)*315.D0)/256.D0

        g1 = g1 + k * (Math.pow(n, 4) * Math.cos(8 * bm) * Math.sin(4 * db) * 315) / 256;

        if(to_xy) {
            return g1;
        }
        /*
        IF(R.EQ.0) THEN
        G=G1
        RETURN
        ENDIF

        IF(R.EQ.1.AND.ABS(G-G1).GT.1D-4) THEN
        GOTO 30
        ELSE
        BR=BO+DB
        G=G1

        RETURN
        ENDIF

        END
        */
    }



}(Holsen));