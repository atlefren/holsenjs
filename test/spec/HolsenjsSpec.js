describe("HolsenJS", function() {


    it("should be defined", function() {
        expect(Holsen).toBeDefined();
    });

    describe("meridbue", function() {

        it("should be defined", function() {
            expect(Holsen.meridbue).toBeDefined();
        });

        it("should reproduce the results from the manual", function() {
            expect(Holsen.meridbue(Holsen.ellipsoids.bessel, 0, 58)).toBe(6430707.92);
        });
    });

    describe("krrad", function() {

        it("should be defined", function() {
            expect(Holsen.krrad).toBeDefined();
        });

        it("should reproduce the results from the manual", function() {
            var res = Holsen.krrad(Holsen.ellipsoids.international, 50, 140);
            expect(res.M).toBe(6373184.538);
            expect(res.N).toBe(6391006.798);
            expect(res.MR).toBe(6382089.447);
            expect(res.AR).toBe(6380536.202);
        });

    });
});