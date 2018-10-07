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
        this.playerCount = parseInt(inputs[0]); // number of players in the game (2 to 4 players)
        this.id = parseInt(inputs[1]); // ID of your player (0, 1, 2, or 3)
        this.droneCount = parseInt(inputs[2]); // number of drones in each team (3 to 11)
        this.zoneCount = parseInt(inputs[3]); // number of zones on the map (4 to 8)
        this.allDrones = [];
        this.enemyDrones = [];
        this.myDrones = [];
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
        this.zones = this.zones.map(function (zone) {
            var TID = parseInt(readline());
            zone.controlledBy = TID;
            zone.isControlled = TID > 0;
            zone.isControlledByMe = TID === _this.id;
            zone.resetCount();
            return zone;
            // ID of the team controlling the zone (0, 1, 2, or 3) or -1 if it is not controlled.
            // The zones are given in the same order as in the initialization.
        });
    };
    GameInformation.prototype.updateDroneTracking = function () {
        var _this = this;
        this.allDrones = [];
        this.enemyDrones = [];
        this.myDrones = [];
        // The first D lines contain the coordinates of drones of a player with the ID 0,
        // the following D lines those of the drones of player 1, and thus it continues until the last player.
        for (var player = 0; player < this.playerCount; player++) {
            var _loop_1 = function () {
                inputs = readline().split(" ");
                DX = parseInt(inputs[0]);
                DY = parseInt(inputs[1]);
                var d = new Drone(DX, DY, drone, player);
                this_1.allDrones.push(d);
                if (player === this_1.id) {
                    this_1.myDrones.push(d);
                }
                else {
                    this_1.enemyDrones.push(d);
                }
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
        this.zones = this.zones.map(function (zone) {
            zone.myDroneCount = zone.droneCounts[_this.id];
            zone.highestEnemeyCount = zone.getHighestOcupant(_this.id);
            zone.overflow = zone.myDroneCount - zone.highestEnemeyCount;
            return zone;
        });
    };
    GameInformation.prototype.moveDrone = function (x, y) {
        print(x + " " + y);
    };
    GameInformation.prototype.moveToZone = function (zone) {
        return zone.x + " " + zone.y;
    };
    GameInformation.prototype.moveDronesToClosestZone = function () {
        var _this = this;
        this.myDrones.forEach(function (drone) {
            var closest = _this.zones.sort(function (zone1, zone2) {
                return Helpers.sortByClosestZone(zone1, zone2, drone);
            })[0];
            _this.moveToZone(closest);
        });
    };
    GameInformation.prototype.getExposedZones = function () {
        var _this = this;
        return this.zones.filter(function (zone) {
            return (zone.isExposed() && zone.controlledBy !== _this.id);
        });
    };
    GameInformation.prototype.getTiedMine = function () {
        return this.zones.filter(function (zone) { return zone.isControlledByMe && zone.highestEnemeyCount > 0 && zone.highestEnemeyCount === zone.myDroneCount; });
    };
    GameInformation.prototype.getMine = function () {
        Helpers.log("Zones: " + this.zones.map(function (z) { return JSON.stringify({ cbm: z.isControlledByMe, c: z.highestEnemeyCount }); }));
        return this.zones.filter(function (zone) { return zone.isControlledByMe; });
    };
    GameInformation.prototype.getTiedZonesNotMine = function () {
        return this.zones.filter(function (zone) { return zone.highestEnemeyCount > 0
            && zone.highestEnemeyCount === zone.myDroneCount &&
            !zone.isControlledByMe; });
    };
    GameInformation.prototype.getClosestZone = function (drone) {
        return this.zones.reduce(function (zone1, zone2) { return Helpers.getClosestZone(zone1, zone2, drone); }, this.zones[0]);
    };
    GameInformation.prototype.getZonesIAmLosing = function () {
        return this.zones.filter(function (zone) { return !zone.isControlledByMe && !zone.isExposed(); });
    };
    GameInformation.prototype.getClosestDrones = function (zone) {
        var sortedDrones = this.myDrones.map(function (d) { return d; }).sort(function (d1, d2) { return Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone); });
        return sortedDrones;
    };
    GameInformation.prototype.getClosestAvailableDrone = function (zone) {
        var losingTiedZones = this.getTiedZonesNotMine();
        var mostPolulatedTiedNotMine = losingTiedZones.reduce(function (z1, z2) { return z1.overflow < z2.overflow ? z1 : z2; }, losingTiedZones[0]);
        var drones = this.myDrones.map(function (d) { return d; });
        drones.sort(function (d1, d2) { return Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone); })
            .filter(function (drone) { return !drone.currentZone
            || (drone.currentZone.isControlledByMe && drone.currentZone.highestEnemeyCount === 0)
            || (!drone.currentZone.isControlledByMe && drone.currentZone.overflow > 0); }
        // || drone.currentZone === mostPolulatedTiedNotMine
        );
        return drones;
    };
    GameInformation.prototype.getClosestEnemyDroneDistance = function (zone) {
        var enemies = this.enemyDrones
            .map(function (d) { return d; })
            .sort(function (d1, d2) { return Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone); });
        return enemies[0];
    };
    GameInformation.prototype.sortByClosest = function (zones, drone) {
        return zones.sort(function (zone1, zone2) { return Helpers.sortByClosestZone(zone1, zone2, drone); });
    };
    GameInformation.prototype.protectDronesSinglePass = function (zones, requested, orders) {
        var _this = this;
        var requestedTracking = [];
        if (zones.length > 0) {
            zones.forEach(function (zone) {
                Helpers.log("Requests " + JSON.stringify(requestedTracking));
                var d = _this.getClosestDrones(zone)[0];
                var ed = _this.getClosestEnemyDroneDistance(zone);
                var fdistance = Helpers.calculateDistance(d, zone);
                var edistance = Helpers.calculateDistance(ed, zone);
                var request = requestedTracking.find(function (r) { return r.droneId === d.id; });
                if (request && request.distance > fdistance) {
                    request.distance = fdistance;
                    request.droneId = d.id;
                    request.zoneId = zone.id;
                }
                else if (requested.indexOf(d.id) === -1 && edistance - fdistance < 99) {
                    requestedTracking.push({
                        zoneId: zone.id,
                        droneId: d.id,
                        distance: fdistance
                    });
                    requested.push(d.id);
                }
                else {
                    requested.push(d.id);
                }
                Helpers.log("Zone " + zone.id + " Requested: " + d.id);
                orders[d.id] = _this.moveToZone(zone);
            });
        }
        Helpers.log("requested: " + requested.join('|'));
        Helpers.log("------------------------------");
    };
    GameInformation.prototype.protectDronesMultiPass = function (zones, requested, orders) {
        var _this = this;
        var requestedTracking = [];
        Helpers.log("requested: " + requested.join('|'));
        if (zones.length > 0) {
            zones.forEach(function (zone) {
                var d = _this.getClosestDrones(zone)[0];
                var ed = _this.getClosestEnemyDroneDistance(zone);
                var fdistance = Helpers.calculateDistance(d, zone);
                var edistance = Helpers.calculateDistance(ed, zone);
                var request = requestedTracking.find(function (r) { return r.droneId === d.id; });
                do {
                    if (requested.indexOf(d.id) === -1) {
                        if (edistance - fdistance < 99) {
                            requestedTracking.push({
                                zoneId: zone.id,
                                droneId: d.id,
                                distance: fdistance
                            });
                            requested.push(d.id);
                        }
                    }
                    else if (request && request.distance > fdistance) {
                        request.distance = fdistance;
                        request.droneId = d.id;
                        request.zoneId = zone.id;
                    }
                } while (requested.length < _this.droneCount);
                Helpers.log("Zone " + zone.id + " Requested: " + d.id);
                orders[d.id] = _this.moveToZone(zone);
            });
        }
        Helpers.log("requested: " + requested.join('|'));
        Helpers.log("------------------------------");
    };
    GameInformation.prototype.pointsAttracting = function () {
        var _this = this;
        var orders = this.myDrones.map(function (drone) { return _this.moveToZone(_this.getClosestZone(drone)); });
        var requestedDrones = [];
        var mine = this.getMine();
        var tiedMine = this.getTiedMine();
        var tiedNotMine = this.getTiedZonesNotMine();
        var losingZones = this.getZonesIAmLosing();
        var exposedZones = this.getExposedZones();
        Helpers.log("mine: " + mine.map(function (z) { return z.id; }).join('|'));
        Helpers.log("tiedMine: " + tiedMine.map(function (z) { return z.id; }).join('|'));
        Helpers.log("tiedNotMine: " + tiedNotMine.map(function (z) { return z.id; }).join('|'));
        Helpers.log("losingZones: " + losingZones.map(function (z) { return z.id; }).join('|'));
        Helpers.log("exposedZones: " + exposedZones.map(function (z) { return z.id; }).join('|'));
        // Protecting
        if (mine.length === this.zoneCount) {
            this.protectDronesMultiPass(mine, requestedDrones, orders);
        }
        else {
            this.protectDronesSinglePass(mine, requestedDrones, orders);
        }
        do {
            // Exposed
            if (exposedZones.length > 0) {
                exposedZones.forEach(function (zone) {
                    var drone;
                    var closest = _this.getClosestAvailableDrone(zone);
                    for (var _i = 0, closest_1 = closest; _i < closest_1.length; _i++) {
                        var d = closest_1[_i];
                        if (requestedDrones.indexOf(d.id) === -1) {
                            drone = d;
                            break;
                        }
                    }
                    if (drone) {
                        requestedDrones.push(drone.id);
                        Helpers.log("Zone " + zone.id + " Requested: " + drone.id);
                        orders[drone.id] = _this.moveToZone(zone);
                    }
                });
            }
            // Tied Mine
            if (tiedMine.length > 0) {
                tiedMine.forEach(function (zone) {
                    var closestDrone = _this.getClosestAvailableDrone(zone)[0];
                    Helpers.log("Zone " + zone.id + " Requested: " + closestDrone.id);
                    requestedDrones.push(closestDrone.id);
                    orders[closestDrone.id] = _this.moveToZone(closestDrone.currentZone);
                });
            }
            // losing
            if (tiedNotMine.length > 0) {
                tiedNotMine.forEach(function (zone) {
                    var offset = Math.abs(zone.overflow) + 1;
                    var closestDrones = _this.getClosestAvailableDrone(zone);
                    var drones = [];
                    for (var _i = 0, closestDrones_1 = closestDrones; _i < closestDrones_1.length; _i++) {
                        var drone = closestDrones_1[_i];
                        if (offset > 0 && requestedDrones.indexOf(drone.id) === -1) {
                            drones.push(drone);
                            offset--;
                            break;
                        }
                    }
                    ;
                    if (drones.length > 0) {
                        requestedDrones.push.apply(requestedDrones, drones.map(function (d) { return d.id; }));
                        drones.forEach(function (drone) {
                            Helpers.log("Zone " + zone.id + " Requested: " + drone.id);
                            orders[drone.id] = _this.moveToZone(zone);
                        });
                    }
                });
            }
            // losing
            if (losingZones.length > 0) {
                losingZones.forEach(function (zone) {
                    var offset = Math.abs(zone.overflow) + 1;
                    var closestDrones = _this.getClosestAvailableDrone(zone);
                    var drones = [];
                    for (var _i = 0, closestDrones_2 = closestDrones; _i < closestDrones_2.length; _i++) {
                        var drone = closestDrones_2[_i];
                        if (offset > 0 && requestedDrones.indexOf(drone.id) === -1) {
                            drones.push(drone);
                            offset--;
                            break;
                        }
                    }
                    ;
                    if (drones.length > 0) {
                        requestedDrones.push.apply(requestedDrones, drones.map(function (d) { return d.id; }));
                        drones.forEach(function (drone) {
                            Helpers.log("Zone " + zone.id + " Requested: " + drone.id);
                            orders[drone.id] = _this.moveToZone(zone);
                        });
                    }
                });
            }
        } while (requestedDrones.length < this.droneCount);
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
    Helpers.log = function (message) {
        if (this.debugMode) {
            printErr(message);
        }
    };
    Helpers.debugMode = true;
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
    Zone.prototype.getHighestOcupant = function (id) {
        var highest = 0;
        for (var x = 0; x < this.droneCounts.length; x++) {
            if (x != id) {
                if (this.droneCounts[x] > highest) {
                    highest = this.droneCounts[x];
                }
            }
        }
        return highest;
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
    function Drone(x, y, id, master) {
        var _this = _super.call(this, x, y) || this;
        _this.currentZone = null;
        _this.id = null;
        _this.id = id;
        _this.master = master;
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
Helpers.debugMode = true;
// game loop
while (true) {
    overlord.updateZoneControl();
    overlord.updateDroneTracking();
    var orders = overlord.pointsAttracting();
    overlord.excecuteOrders(orders);
}
// someguy314
//nbZones=4
//nbDrones=5
//gameSeed=1538891043141
// nbZones=4
// nbDrones=5
// gameSeed=1538926129913
