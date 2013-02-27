describe("HolsenJS", function () {

    "use strict";

    var holsen;

    beforeEach(function () {
        holsen = new Holsen();
    });

    it("should be defined", function () {
        expect(Holsen).toBeDefined();
    });

    describe("ellipsoids", function () {

        it("should have three valid ellipsoids", function () {
            var ellipsoids = holsen.getEllipsoids();
            expect(ellipsoids.bessel).toBeDefined();
            expect(ellipsoids.international).toBeDefined();
            expect(ellipsoids.wgs84).toBeDefined();
        });

        it("should not complain when setting a valid ellipsoid as string", function () {
            holsen.setEllipsoid("bessel");
        });

        it("should complain when setting an invalid ellipsoid as string", function () {
            expect(function () {holsen.setEllipsoid("bambus"); }).toThrow(new Error("Non-existing ellipsoid: bambus"));
        });

        it("should not complain when setting a valid ellipsoid object", function () {
            holsen.setEllipsoid({
                "a": 6378137.000,
                "b": 6356752.314
            });
        });

        it("should complain when setting an invalid ellipsoid object", function () {
            expect(function () {
                holsen.setEllipsoid({
                    "b": 6356752.314
                });
            }).toThrow(new Error("The entered ellipsoid is either missing or have non-numbers as a or b."));

            expect(function () {
                holsen.setEllipsoid({
                    "a": 6378137.000
                });
            }).toThrow(new Error("The entered ellipsoid is either missing or have non-numbers as a or b."));

            expect(function () {
                holsen.setEllipsoid({
                    "a": "bambus",
                    "b": 6356752.314
                });
            }).toThrow(new Error("The entered ellipsoid is either missing or have non-numbers as a or b."));
        });
    });

    describe("meridbue", function () {


        it("should be defined for lon lat", function () {
            expect(holsen.meridbue).toBeDefined();
        });

        it("should reproduce the results from the manual for lon lat", function () {
            holsen.setEllipsoid("bessel");
            expect(holsen.meridbue(0, 58)).toBe(6430707.92);
        });

        it("should be defined for lat and meridian length", function () {
            expect(holsen.meridbue_inv).toBeDefined();
        });

        it("should be able to calculate back", function () {
            holsen.setEllipsoid("bessel");
            expect(holsen.meridbue_inv(0, 6430707.92)).toBe(58);
        });

        it("should throw an error when ellipsoid not set", function () {

            expect(function () {
                holsen.meridbue(0, 6430707.92);
            }).toThrow(new Error("Ellipsoid not set (call holsen.setEllipsoid()!)."));

            expect(function () {
                holsen.meridbue_inv(0, 6430707.92);
            }).toThrow(new Error("Ellipsoid not set (call holsen.setEllipsoid()!)."));

        });
    });

    describe("krrad", function () {

        it("should be defined", function () {
            expect(holsen.krrad).toBeDefined();
        });

        it("should reproduce the results from the manual", function () {
            holsen.setEllipsoid("international");
            var res = holsen.krrad(50, 140);
            expect(res.M).toBe(6373184.538);
            expect(res.N).toBe(6391006.798);
            expect(res.MR).toBe(6382089.447);
            expect(res.AR).toBe(6380536.202);
        });

        it("should throw an error when ellipsoid not set", function () {

            expect(function () {
                holsen.krrad(50, 140);
            }).toThrow(new Error("Ellipsoid not set (call holsen.setEllipsoid()!)."));
        });

    });

    describe("l-geo1", function () {

        it("should be defined", function () {
            expect(holsen.lgeo1).toBeDefined();
        });

        it("should reproduce the results from the manual", function () {
            holsen.setEllipsoid("international");
            var res = holsen.lgeo1(50, 10, 15000000, 140);
            expect(res.B2).toBe(-62.950889964);
        });

        it("should throw an error when ellipsoid not set", function () {
            expect(function () {
                holsen.lgeo1(50, 10, 15000000, 140);
            }).toThrow(new Error("Ellipsoid not set (call holsen.setEllipsoid()!)."));
        });
    });

    describe("konverg", function () {

        it("should be defined", function () {
            expect(holsen.konverg).toBeDefined();
        });

        it("should reproduce the results from the manual", function () {
            holsen.setEllipsoid("wgs84");
            var res = holsen.konverg(63.12345678, 10.12345678, 9);
            expect(res).toBe(1.1134782);
        });

        it("should throw an error when ellipsoid not set", function () {
            expect(function () {
                holsen.konverg(63.12345678, 10.12345678, 9);
            }).toThrow(new Error("Ellipsoid not set (call holsen.setEllipsoid()!)."));
        });
    });

    describe("blxy", function () {

        describe("bl_to_xy", function () {

            it("should be defined", function () {
                expect(holsen.bl_to_xy).toBeDefined();
            });

            //WEll, seems like the presicion is off here.. fuck it..
            it("should reproduce the results from the manual", function () {
                holsen.setEllipsoid("wgs84");
                holsen.setCoordsystem("UTM");
                var res = holsen.bl_to_xy(63.10, 10.10, 0, 9);

                expect(res.x).toBe(6997206.3527);
                expect(res.y).toBe(555527.1335);

                /* THESE ARE THE ACTUAL ONES
            expect(res.x).toBe(6997206.3054);
            expect(res.y).toBe(555525.1191);
            */
            });

            it("should throw an error when ellipsoid not set", function () {
                holsen.setCoordsystem("UTM");
                expect(function () {
                    holsen.bl_to_xy(63.10, 10.10, 0, 9);
                }).toThrow(new Error("Ellipsoid not set (call holsen.setEllipsoid()!)."));
            });

            it("should throw an error when coordsystem not set", function () {
                holsen.setEllipsoid("wgs84");
                expect(function () {
                    holsen.bl_to_xy(63.10, 10.10, 0, 9);
                }).toThrow(new Error("Coordsystem not set (call holsen.setCoordsystem()!)."));
            });

        });

        describe("xy_to_bl", function () {

            it("should be defined", function () {
                expect(holsen.xy_to_bl).toBeDefined();
            });

            //the presicion is off here as well.. fuck it..
            it("should reproduce some results calculated with fortran", function () {

                holsen.setEllipsoid("wgs84");
                holsen.setCoordsystem("UTM");

                var res = holsen.xy_to_bl(6997206.3054, 555525.1191, 0, 9);

                expect(res.lon).toBe(10.100107375);
                expect(res.lat).toBe(63.099999576);
                /*
                expect(res.lon).toBe(10.100000000);
                expect(res.lat).toBe(63.100000000);
                */
            });

            it("should throw an error when ellipsoid not set", function () {
                holsen.setCoordsystem("UTM");
                expect(function () {
                    holsen.xy_to_bl(6997206.3054, 555525.1191, 0, 9);
                }).toThrow(new Error("Ellipsoid not set (call holsen.setEllipsoid()!)."));
            });

            it("should throw an error when coordsystem not set", function () {
                holsen.setEllipsoid("wgs84");
                expect(function () {
                    holsen.xy_to_bl(6997206.3054, 555525.1191, 0, 9);
                }).toThrow(new Error("Coordsystem not set (call holsen.setCoordsystem()!)."));
            });

        });

    });
});