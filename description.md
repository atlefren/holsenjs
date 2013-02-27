l-geo1
------
The 1st geodetic main task

Implemented as:
- lgeo1
-- Params: lon, lat, length, azimuth

l-geo2
------
The 2nd geodetic main task

Implemented as:
- lgeo2
-- Params: lon1, lat1, lon2, lat2

krrad
-----
The principle radii of curvature (M and N) and a radius of curvature in a direction with azimuth A

Implemented as:
- krrad
-- Params: lat, azimuth

meridbue
--------
The length of a meridian between two points, for instance from Equator to a point with a latitude equal B.

Implemented as:
- meridbue: Find length of meridian
-- Params: lat1, lat2
- meridbue_inv: Find Latitude 2 when Latitude 1 and meridian length is known
-- Params: lat, arc

konverg
-------- 
Compute the meridian convergence in a point. Returns in "gon"

Implemented as:
- konverg
-- params: lon, lat, lat_0
- konverg_xy
--params x, y, lon_0, lat_0

blxy
--------
From latitude/longitude to the x/y coordinates in the map projection plane. And visa versa, from the
plane to the ellipsoid

Some precision issues here, expect some meters wrong...

Implemented as:
- bl_to_xy
-- Params: lon, lat, lon_0, lat_0
- xy_to_bl
-- Params: x, y, lon_0, lat_0