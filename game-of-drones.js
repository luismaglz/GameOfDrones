"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var GameInformation = /** @class */ (function () {
    function GameInformation() {
        var inputs = readline().split(' ');
        this.playerCount = parseInt(inputs[0]); // number of players in the game (2 to 4 players)
        this.id = parseInt(inputs[1]); // ID of your player (0, 1, 2, or 3)
        this.droneCount = parseInt(inputs[2]); // number of drones in each team (3 to 11)
        this.zoneCount = parseInt(inputs[3]); // number of zones on the map (4 to 8)
        this.drones = new DroneTracking();
        for (var i = 0; i < this.playerCount; i++) {
            this.drones[i] = [];
        }
        this.initializeZones();
    }
    GameInformation.prototype.initializeZones = function () {
        this.zones = [];
        for (var i = 0; i < this.zoneCount; i++) {
            var inputs = readline().split(' ');
            // corresponds to the position of the center of a zone. A zone is a circle with a radius of 100 units.
            var X = parseInt(inputs[0]);
            var Y = parseInt(inputs[1]);
            this.zones.push(new Zone(X, Y, this.playerCount));
        }
    };
    GameInformation.prototype.updateZoneControl = function () {
        var _this = this;
        this.zones.forEach(function (zone) {
            var TID = parseInt(readline());
            zone.controlledBy = TID;
            zone.isControlled = TID > 0;
            zone.isControlledByMe = TID === _this.id;
            zone.resetCount();
            // ID of the team controlling the zone (0, 1, 2, or 3) or -1 if it is not controlled. 
            // The zones are given in the same order as in the initialization.
        });
    };
    GameInformation.prototype.updateDroneTracking = function () {
        // The first D lines contain the coordinates of drones of a player with the ID 0,
        // the following D lines those of the drones of player 1, and thus it continues until the last player.
        for (var player = 0; player < this.playerCount; player++) {
            var _loop_1 = function () {
                inputs = readline().split(' ');
                DX = parseInt(inputs[0]);
                DY = parseInt(inputs[1]);
                if (this_1.drones[player][drone]) {
                    this_1.drones[player][drone].x = DX;
                    this_1.drones[player][drone].y = DY;
                }
                else {
                    this_1.drones[player][drone] = new Drone(DX, DY);
                }
                var d = this_1.drones[player][drone];
                var zone = this_1.zones.find(function (zone) {
                    return Helpers.isInZone(d, zone);
                });
                if (zone) {
                    zone.droneCounts[player]++;
                }
            };
            var this_1 = this, inputs, DX, DY;
            for (var drone = 0; drone < this.droneCount; drone++) {
                _loop_1();
            }
        }
    };
    GameInformation.prototype.moveDrone = function (x, y) {
        print(x + " " + y);
    };
    GameInformation.prototype.moveDronesToClosestZone = function () {
        var _this = this;
        this.drones[this.id].forEach(function (drone) {
            var freeZones = _this.zones
                .filter(function (zone) { return zone.isExposed() && !zone.isControlledByMe; });
            var closestFreeZone;
            if (freeZones.length > 0) {
                closestFreeZone =
                    freeZones.reduce(function (previous, next) { return Helpers.getClosestZone(previous, next, drone); }, freeZones[0]);
            }
            if (closestFreeZone) {
                _this.moveDrone(closestFreeZone.x, closestFreeZone.y);
            }
            else {
                var closestImLosing = void 0;
                var closestZonesImLosing = _this.zones
                    .filter(function (zone) { return Helpers.getZonesWhereOutnumbered(zone, _this.id); });
                if (closestZonesImLosing.length > 0) {
                    closestImLosing = closestZonesImLosing.reduce(function (previous, next) { return Helpers.getClosestZone(previous, next, drone); }, closestZonesImLosing[0]);
                    _this.moveDrone(closestImLosing.x, closestImLosing.y);
                }
                else {
                    _this.moveDrone(drone.x, drone.y);
                }
            }
        });
    };
    return GameInformation;
}());
var Helpers = /** @class */ (function () {
    function Helpers() {
    }
    Helpers.calculateDistance = function (point1, point2) {
        var a = point1.x - point2.x;
        var b = point1.y - point2.y;
        return Math.sqrt(a * a + b * b);
    };
    Helpers.getZonesWhereOutnumbered = function (zone, id) {
        var mine = 0;
        var other = -1;
        if (zone.droneCounts[id]) {
            mine = zone.droneCounts[id];
        }
        for (var x = 0; x < zone.droneCounts.length; x++) {
            if (x !== id && zone.droneCounts[x] > other) {
                other = zone.droneCounts[x];
            }
        }
        return other < mine;
    };
    Helpers.isInZone = function (point1, point2) {
        return this.calculateDistance(point1, point2) < 100;
    };
    Helpers.getClosestZone = function (previousZone, zone, drone) {
        var previous = Helpers.calculateDistance(drone, previousZone);
        var current = Helpers.calculateDistance(drone, zone);
        return previous < current ? previousZone : zone;
    };
    return Helpers;
}());
var Point = /** @class */ (function () {
    function Point(pX, pY) {
        this.x = pX;
        this.y = pY;
    }
    return Point;
}());
var Zone = /** @class */ (function (_super) {
    __extends(Zone, _super);
    function Zone(x, y, pCount) {
        var _this = _super.call(this, x, y) || this;
        _this.droneCounts = [];
        for (var p = 0; p < pCount; p++) {
            _this.droneCounts.push(0);
        }
        return _this;
    }
    Zone.prototype.isExposed = function () {
        return this.droneCounts.reduce(function (a, b) { return a + b; }, 0) === 0;
    };
    Zone.prototype.resetCount = function () {
        this.droneCounts = this.droneCounts.map(function (c) { return 0; });
    };
    return Zone;
}(Point));
var Drone = /** @class */ (function (_super) {
    __extends(Drone, _super);
    function Drone(x, y) {
        return _super.call(this, x, y) || this;
    }
    return Drone;
}(Point));
var DroneTracking = /** @class */ (function () {
    function DroneTracking() {
    }
    return DroneTracking;
}());
var overlord = new GameInformation();
// game loop
while (true) {
    overlord.updateZoneControl();
    overlord.updateDroneTracking();
    overlord.moveDronesToClosestZone();
}
