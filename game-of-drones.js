///<reference path="definitions.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var GameInformation = /** @class */ (function () {
    function GameInformation() {
        this.zones = new Array();
        var inputs = readline().split(" ");
        printErr(JSON.stringify(inputs));
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
        for (var i = 0; i < this.zoneCount; i++) {
            var inputs = readline().split(" ");
            // corresponds to the position of the center of a zone. A zone is a circle with a radius of 100 units.
            var X = parseInt(inputs[0]);
            var Y = parseInt(inputs[1]);
            this.zones.push(new Zone(X, Y, this.playerCount, i));
        }
    };
    GameInformation.prototype.updateZoneControl = function () {
        var _this = this;
        printErr(JSON.stringify(this.zones.map(function (zone) { return zone.id + ' ' + zone.controlledBy; })));
        this.zones = this.zones.map(function (zone) {
            var TID = parseInt(readline());
            printErr(JSON.stringify(TID));
            zone.controlledBy = TID;
            zone.isControlled = TID > 0;
            zone.isControlledByMe = TID === _this.id;
            zone.resetCount();
            return zone;
            // ID of the team controlling the zone (0, 1, 2, or 3) or -1 if it is not controlled.
            // The zones are given in the same order as in the initialization.
        });
        printErr(JSON.stringify(this.zones.map(function (zone) { return zone.id + ' ' + zone.controlledBy; })));
    };
    GameInformation.prototype.updateDroneTracking = function () {
        // The first D lines contain the coordinates of drones of a player with the ID 0,
        // the following D lines those of the drones of player 1, and thus it continues until the last player.
        for (var player = 0; player < this.playerCount; player++) {
            var _loop_1 = function () {
                inputs = readline().split(" ");
                DX = parseInt(inputs[0]);
                DY = parseInt(inputs[1]);
                if (this_1.drones[player][drone]) {
                    this_1.drones[player][drone].x = DX;
                    this_1.drones[player][drone].y = DY;
                }
                else {
                    this_1.drones[player][drone] = new Drone(DX, DY, drone);
                }
                var d = this_1.drones[player][drone];
                var zone = this_1.zones.find(function (zone) {
                    return Helpers.isInZone(d, zone);
                });
                if (zone) {
                    zone.droneCounts[player]++;
                    d.currentZone = zone;
                }
                else {
                    d.currentZone = null;
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
    GameInformation.prototype.moveToZone = function (zone) {
        return zone.x + " " + zone.y;
    };
    GameInformation.prototype.moveDronesToClosestZone = function () {
        var _this = this;
        this.drones[this.id].forEach(function (drone) {
            var closest = _this.zones.sort(function (zone1, zone2) {
                return Helpers.sortByClosestZone(zone1, zone2, drone);
            })[0];
            _this.moveToZone(closest);
        });
    };
    GameInformation.prototype.prioritizeAndMoveToEasiestZone = function () {
        var _this = this;
        var orders;
        var zonesTargeted = new Array();
        // Look for exposed zones
        var exposedZones = this.zones.filter(function (zone) {
            return (zone.isExposed() && zone.controlledBy !== _this.id);
        });
        printErr("exposedZones: " + JSON.stringify(exposedZones.map(function (zone) { return zone.id; })));
        printErr("id: " + this.id);
        // The remaining drones should fight for other zones
        var zonesThatIAmLosing = this.zones.filter(function (zone) {
            return Helpers.getZonesWhereOutnumbered(zone, _this.id);
        });
        var tiedZones = this.zones.filter(function (zone) { return zone.getHighestOcupant() > 0 && zone.getHighestOcupant() === zone.getDroneCount(_this.id); });
        orders = this.drones[this.id].map(function (drone) {
            // Check if the drone is in a zone that is neutral, meaning that if it leaves the zone I will lose it
            if (drone.currentZone !== null && !drone.currentZone.isControlled && _this.droneCount > 4) {
                return _this.moveToZone(drone.currentZone);
            }
            // Leave losing zone
            if (drone.currentZone !== null && !drone.currentZone.isControlledByMe && drone.currentZone.getHighestOcupant() > drone.currentZone.getDroneCount(_this.id)) {
                //this drone is useless, it should help other people
                if (tiedZones.length > 0) {
                    var closestTiedZone = tiedZones.reduce(function (zone1, zone2) { return Helpers.getClosestZone(zone1, zone2, drone); }, tiedZones[0]);
                    return _this.moveToZone(closestTiedZone);
                }
                else {
                    var leastAmmount = _this.zones.reduce(function (z1, z2) { return z1.getTotalDrones() < z2.getTotalDrones() ? z1 : z2; }, _this.zones[0]);
                    return _this.moveToZone(leastAmmount);
                }
            }
            // If im the only one in the zone
            if (drone.currentZone !== null && drone.currentZone.getTotalDrones() === 1) {
                if (exposedZones.length > 0) {
                    exposedZones.sort(function (zone1, zone2) { return Helpers.sortByClosestZone(zone1, zone2, drone); });
                    var zone = exposedZones.shift();
                    return _this.moveToZone(zone);
                }
            }
            if (drone.currentZone !== null && drone.currentZone.getDroneCount(_this.id) === drone.currentZone.getTotalDrones() && drone.currentZone.getTotalDrones() > 1) {
                if (exposedZones.length > 0) {
                    exposedZones.sort(function (zone1, zone2) { return Helpers.sortByClosestZone(zone1, zone2, drone); });
                    var zone = exposedZones.shift();
                    return _this.moveToZone(zone);
                }
            }
            // Target Exposed Zones
            if (exposedZones.length > 0) {
                exposedZones.sort(function (zone1, zone2) { return Helpers.sortByClosestZone(zone1, zone2, drone); });
                var zone = exposedZones.shift();
                return _this.moveToZone(zone);
            }
            // Go to tied zone
            if (drone.currentZone === null) {
                if (tiedZones.length > 0) {
                    var closestTiedZone = tiedZones.sort(function (zone1, zone2) { return Helpers.sortByClosestZone(zone1, zone2, drone); }).shift();
                    return _this.moveToZone(closestTiedZone);
                }
            }
            //Look for zones that i am losing, at this point only drones that are not esential should be available to me
            if (zonesThatIAmLosing.length > 0) {
                zonesThatIAmLosing.sort(function (zone1, zone2) { return Helpers.sortByClosestZone(zone1, zone2, drone); });
                var zoneIAmLosing = zonesThatIAmLosing.shift();
                var highestOccupant = zoneIAmLosing.getHighestOcupant();
                var mine = zoneIAmLosing.getDroneCount(_this.id);
                return _this.moveToZone(zoneIAmLosing);
            }
            // Fallback
            var closestZone = _this.zones.reduce(function (zone1, zone2) { return Helpers.getClosestZone(zone1, zone2, drone); }, _this.zones[0]);
            return _this.moveToZone(closestZone);
        });
        return orders;
    };
    GameInformation.prototype.excecuteOrders = function (orders) {
        orders.forEach(function (order) { return print(order); });
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
        return this.calculateDistance(point1, point2) <= 100;
    };
    Helpers.getClosestZone = function (previousZone, zone, drone) {
        var previous = Helpers.calculateDistance(drone, previousZone);
        var current = Helpers.calculateDistance(drone, zone);
        return previous < current ? previousZone : zone;
    };
    Helpers.sortByClosestZone = function (previousZone, zone, drone) {
        var previous = Helpers.calculateDistance(drone, previousZone);
        var current = Helpers.calculateDistance(drone, zone);
        return previous - current;
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
    function Zone(x, y, pCount, id) {
        var _this = _super.call(this, x, y) || this;
        _this.droneCounts = [];
        _this.id = id;
        for (var p = 0; p < pCount; p++) {
            _this.droneCounts.push(0);
        }
        return _this;
    }
    Zone.prototype.isExposed = function () {
        return this.droneCounts.reduce(function (a, b) { return a + b; }, this.droneCounts[0]) === 0;
    };
    Zone.prototype.getHighestOcupant = function () {
        return this.droneCounts.reduce(function (a, b) { return a > b ? a : b; }, this.droneCounts[0]);
    };
    Zone.prototype.getDroneCount = function (id) {
        return this.droneCounts[id];
    };
    Zone.prototype.getTotalDrones = function () {
        return this.droneCounts.reduce(function (a, b) { return a + b; }, this.droneCounts[0]);
    };
    Zone.prototype.resetCount = function () {
        this.droneCounts = this.droneCounts.map(function (c) { return 0; });
    };
    return Zone;
}(Point));
var Drone = /** @class */ (function (_super) {
    __extends(Drone, _super);
    function Drone(x, y, id) {
        var _this = _super.call(this, x, y) || this;
        _this.currentZone = null;
        _this.id = null;
        _this.id = id;
        return _this;
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
    var orders = overlord.prioritizeAndMoveToEasiestZone();
    printErr(JSON.stringify(orders));
    overlord.excecuteOrders(orders);
}
