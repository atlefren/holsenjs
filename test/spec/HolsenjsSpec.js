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
});