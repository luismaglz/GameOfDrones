declare function readline(): string;
declare function print(value: string): void;
declare function printErr(message: string): void;

class GameInformation {
  playerCount: number;
  id: number;
  droneCount: number;
  zoneCount: number;
  zones: Array<Zone> = new Array<Zone>();
  allDrones: Array<Drone>;
  enemyDrones: Array<Drone>;
  myDrones: Array<Drone>;
  constructor() {
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

  initializeZones(): void {
    for (var i = 0; i < this.zoneCount; i++) {
      const inputs = readline().split(" ");
      // corresponds to the position of the center of a zone. A zone is a circle with a radius of 100 units.
      const X = parseInt(inputs[0]);
      const Y = parseInt(inputs[1]);
      this.zones.push(new Zone(X, Y, this.playerCount, i));
    }
  }

  updateZoneControl(): void {

    this.zones = this.zones.map(zone => {
      var TID = parseInt(readline());
      zone.controlledBy = TID;
      zone.isControlled = TID > 0;
      zone.isControlledByMe = TID === this.id;
      zone.resetCount();
      return zone;
      // ID of the team controlling the zone (0, 1, 2, or 3) or -1 if it is not controlled.
      // The zones are given in the same order as in the initialization.
    });
  }

  updateDroneTracking(): void {
    this.allDrones = [];
    this.enemyDrones = [];
    this.myDrones = [];
    // The first D lines contain the coordinates of drones of a player with the ID 0,
    // the following D lines those of the drones of player 1, and thus it continues until the last player.
    for (var player = 0; player < this.playerCount; player++) {
      for (var drone = 0; drone < this.droneCount; drone++) {
        var inputs = readline().split(" ");
        var DX = parseInt(inputs[0]);
        var DY = parseInt(inputs[1]);

        const d = new Drone(DX, DY, drone, player);

        this.allDrones.push(d);
        if (player === this.id) {
          this.myDrones.push(d)
        } else {
          this.enemyDrones.push(d);
        }

        const zone = this.zones.find(zone => {
          return Helpers.isInZone(d, zone);
        });
        if (zone) {
          zone.droneCounts[player]++;
          d.currentZone = zone;
        } else {
          d.currentZone = null;
        }
      }
    }

    this.zones = this.zones.map(zone => {
      zone.myDroneCount = zone.droneCounts[this.id];
      zone.highestEnemeyCount = zone.getHighestOcupant(this.id);
      zone.overflow = zone.myDroneCount - zone.highestEnemeyCount;
      return zone;
    })
  }
  moveDrone(x: number, y: number): void {
    print(`${x} ${y}`);
  }

  moveToZone(zone: Zone): string {
    return `${zone.x} ${zone.y}`;
  }

  moveDronesToClosestZone(): void {
    this.myDrones.forEach(drone => {
      const closest = this.zones.sort((zone1, zone2) =>
        Helpers.sortByClosestZone(zone1, zone2, drone)
      )[0];
      this.moveToZone(closest);
    });
  }

  getExposedZones(): Zone[] {
    return this.zones.filter(
      zone => {
        return (zone.isExposed() && zone.controlledBy !== this.id)
      }
    );
  }

  getTiedMine(): Zone[] {
    return this.zones.filter(zone => zone.isControlledByMe && zone.highestEnemeyCount > 0 && zone.highestEnemeyCount === zone.myDroneCount);
  }

  getMine(): Zone[] {
    Helpers.log(`Zones: ${this.zones.map(z => { return JSON.stringify({ cbm: z.isControlledByMe, c: z.highestEnemeyCount }) })}`);
    return this.zones.filter(zone => zone.isControlledByMe);
  }

  getTiedZonesNotMine(): Zone[] {
    return this.zones.filter(zone => zone.highestEnemeyCount > 0
      && zone.highestEnemeyCount === zone.myDroneCount &&
      !zone.isControlledByMe);
  }

  getClosestZone(drone: Drone): Zone {
    return this.zones.reduce((zone1, zone2) => Helpers.getClosestZone(zone1, zone2, drone), this.zones[0]);
  }

  getZonesIAmLosing(): Zone[] {
    return this.zones.filter(zone => !zone.isControlledByMe && !zone.isExposed());
  }

  getClosestDrones(zone: Zone): Drone[] {
    const sortedDrones = this.myDrones.map(d => d).sort((d1, d2) => Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone));
    return sortedDrones;
  }

  getClosestAvailableDrone(zone: Zone): Drone[] {
    const losingTiedZones = this.getTiedZonesNotMine();
    const mostPolulatedTiedNotMine = losingTiedZones.reduce((z1, z2) => z1.overflow < z2.overflow ? z1 : z2, losingTiedZones[0]);
    const drones = this.myDrones.map(d => d);
    drones.sort((d1, d2) => Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone))
      .filter(drone => !drone.currentZone
        || (drone.currentZone.isControlledByMe && drone.currentZone.highestEnemeyCount === 0)
        || (!drone.currentZone.isControlledByMe && drone.currentZone.overflow > 0)
        // || drone.currentZone === mostPolulatedTiedNotMine
      );

    return drones;
  }

  getClosestEnemyDroneDistance(zone: Zone): Drone {
    const enemies = this.enemyDrones
      .map(d => d)
      .sort((d1, d2) => Helpers.calculateDistance(d1, zone) - Helpers.calculateDistance(d2, zone))
    return enemies[0];
  }

  sortByClosest(zones: Zone[], drone: Drone) {
    return zones.sort((zone1, zone2) => Helpers.sortByClosestZone(zone1, zone2, drone));
  }

  protectDronesSinglePass(zones: Zone[], requested: number[], orders: string[]): void {
    const requestedTracking: {
      zoneId: number;
      droneId: number;
      distance: number;
    }[] = [];

    if (zones.length > 0) {
      zones.forEach(zone => {
        Helpers.log(`Requests ${JSON.stringify(requestedTracking)}`);

        const d = this.getClosestDrones(zone)[0];
        const ed = this.getClosestEnemyDroneDistance(zone);
        const fdistance = Helpers.calculateDistance(d, zone);
        const edistance = Helpers.calculateDistance(ed, zone);
        const request = requestedTracking.find(r => r.droneId === d.id)

        if (request && request.distance > fdistance) {
          request.distance = fdistance;
          request.droneId = d.id;
          request.zoneId = zone.id;
        } else if (requested.indexOf(d.id) === -1 && edistance - fdistance < 99) {
          requestedTracking.push({
            zoneId: zone.id,
            droneId: d.id,
            distance: fdistance
          });

          requested.push(d.id);
        } else {
          requested.push(d.id);
        }

        Helpers.log(`Zone ${zone.id} Requested: ${d.id}`);
        orders[d.id] = this.moveToZone(zone);
      });
    }
    Helpers.log(`requested: ${requested.join('|')}`);
    Helpers.log(`------------------------------`);

  }

  protectDronesMultiPass(zones: Zone[], requested: number[], orders: string[]): void {
    const requestedTracking: {
      zoneId: number;
      droneId: number;
      distance: number;
    }[] = [];
    Helpers.log(`requested: ${requested.join('|')}`);
    if (zones.length > 0) {
      zones.forEach(zone => {
        const d = this.getClosestDrones(zone)[0];
        const ed = this.getClosestEnemyDroneDistance(zone);
        const fdistance = Helpers.calculateDistance(d, zone);
        const edistance = Helpers.calculateDistance(ed, zone);
        const request = requestedTracking.find(r => r.droneId === d.id)

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
          } else if (request && request.distance > fdistance) {
            request.distance = fdistance;
            request.droneId = d.id;
            request.zoneId = zone.id;
          }
        } while (requested.length < this.droneCount);

        Helpers.log(`Zone ${zone.id} Requested: ${d.id}`);
        orders[d.id] = this.moveToZone(zone);
      });
    }
    Helpers.log(`requested: ${requested.join('|')}`);
    Helpers.log(`------------------------------`);

  }

  pointsAttracting(): string[] {
    const orders = this.myDrones.map(drone => this.moveToZone(this.getClosestZone(drone)));
    const requestedDrones: number[] = [];
    const mine = this.getMine();
    const tiedMine = this.getTiedMine();
    const tiedNotMine = this.getTiedZonesNotMine();
    const losingZones = this.getZonesIAmLosing();
    const exposedZones = this.getExposedZones();

    Helpers.log(`mine: ${mine.map(z => z.id).join('|')}`);
    Helpers.log(`tiedMine: ${tiedMine.map(z => z.id).join('|')}`);
    Helpers.log(`tiedNotMine: ${tiedNotMine.map(z => z.id).join('|')}`);
    Helpers.log(`losingZones: ${losingZones.map(z => z.id).join('|')}`);
    Helpers.log(`exposedZones: ${exposedZones.map(z => z.id).join('|')}`);

    // Protecting
    if (mine.length === this.zoneCount) {
      this.protectDronesMultiPass(mine, requestedDrones, orders);
    } else {
      this.protectDronesSinglePass(mine, requestedDrones, orders);
    }

    do {
      // Exposed
      if (exposedZones.length > 0) {
        exposedZones.forEach(zone => {
          let drone: Drone;
          const closest = this.getClosestAvailableDrone(zone);

          for (let d of closest) {
            if (requestedDrones.indexOf(d.id) === -1) {
              drone = d;
              break;
            }
          }

          if (drone) {
            requestedDrones.push(drone.id);
            Helpers.log(`Zone ${zone.id} Requested: ${drone.id}`);

            orders[drone.id] = this.moveToZone(zone);
          }
        })
      }

      // Tied Mine
      if (tiedMine.length > 0) {
        tiedMine.forEach(zone => {
          const closestDrone = this.getClosestAvailableDrone(zone)[0];
          Helpers.log(`Zone ${zone.id} Requested: ${closestDrone.id}`);
          requestedDrones.push(closestDrone.id);
          orders[closestDrone.id] = this.moveToZone(closestDrone.currentZone);
        })
      }

      // losing
      if (tiedNotMine.length > 0) {
        tiedNotMine.forEach(zone => {
          var offset = Math.abs(zone.overflow) + 1;
          const closestDrones = this.getClosestAvailableDrone(zone);
          let drones: Drone[] = [];
          for (let drone of closestDrones) {
            if (offset > 0 && requestedDrones.indexOf(drone.id) === -1) {
              drones.push(drone);
              offset--;
              break;
            }
          };

          if (drones.length > 0) {
            requestedDrones.push(...drones.map(d => d.id));
            drones.forEach(drone => {
              Helpers.log(`Zone ${zone.id} Requested: ${drone.id}`);
              orders[drone.id] = this.moveToZone(zone);
            })
          }
        })
      }

      // losing
      if (losingZones.length > 0) {
        losingZones.forEach(zone => {
          var offset = Math.abs(zone.overflow) + 1;
          const closestDrones = this.getClosestAvailableDrone(zone);
          let drones: Drone[] = [];
          for (let drone of closestDrones) {
            if (offset > 0 && requestedDrones.indexOf(drone.id) === -1) {
              drones.push(drone);
              offset--;
              break;
            }
          };

          if (drones.length > 0) {
            requestedDrones.push(...drones.map(d => d.id));
            drones.forEach(drone => {
              Helpers.log(`Zone ${zone.id} Requested: ${drone.id}`);
              orders[drone.id] = this.moveToZone(zone);
            })
          }
        })
      }
    } while (requestedDrones.length < this.droneCount);

    return orders;
  }

  excecuteOrders(orders: Array<string>) {
    orders.forEach(order => print(order));
  }
}

class Helpers {
  public static debugMode = true;
  public static calculateDistance(point1: Point, point2: Point): number {
    var a = point1.x - point2.x;
    var b = point1.y - point2.y;
    return Math.sqrt(a * a + b * b);
  }
  public static getZonesWhereOutnumbered(zone: Zone, id: number): boolean {
    let mine = 0;
    let other = -1;
    if (zone.droneCounts[id]) {
      mine = zone.droneCounts[id];
    }
    for (var x = 0; x < zone.droneCounts.length; x++) {
      if (x !== id && zone.droneCounts[x] > other) {
        other = zone.droneCounts[x];
      }
    }
    return other < mine;
  }
  public static isInZone(point1: Point, point2: Point): boolean {
    return this.calculateDistance(point1, point2) <= 100;
  }
  public static getClosestZone(previousZone: Zone, zone: Zone, drone: Drone): Zone {
    const previous = Helpers.calculateDistance(drone, previousZone);
    const current = Helpers.calculateDistance(drone, zone);
    return previous < current ? previousZone : zone;
  }
  public static sortByClosestZone(previousZone: Zone, zone: Zone, drone: Drone): number {
    const previous = Helpers.calculateDistance(drone, previousZone);
    const current = Helpers.calculateDistance(drone, zone);
    return previous - current;
  }
  public static log(message: string) {
    if (this.debugMode) {
      printErr(message);
    }
  }
}

class Point {
  x: number;
  y: number;

  constructor(pX: number, pY: number) {
    this.x = pX;
    this.y = pY;
  }
}

class Zone extends Point {
  id: number;
  controlledBy: number;
  isControlled: boolean;
  isControlledByMe: boolean;
  myDroneCount: number;
  highestEnemeyCount: number;
  overflow: number;
  droneCounts: number[];

  constructor(x: number, y: number, pCount: number, id: number) {
    super(x, y);
    this.droneCounts = [];
    this.id = id;
    for (var p = 0; p < pCount; p++) {
      this.droneCounts.push(0);
    }
  }

  isExposed() {
    return this.droneCounts.reduce((a, b) => a + b, this.droneCounts[0]) === 0;
  }

  getHighestOcupant(id: number): number {
    var highest = 0;
    for (let x = 0; x < this.droneCounts.length; x++) {
      if (x != id) {
        if (this.droneCounts[x] > highest) {
          highest = this.droneCounts[x];
        }
      }
    }
    return highest;
  }

  getDroneCount(id: number): number {
    return this.droneCounts[id];
  }

  getTotalDrones(): number {
    return this.droneCounts.reduce((a, b) => a + b, this.droneCounts[0]);
  }

  resetCount() {
    this.droneCounts = this.droneCounts.map(c => 0);
  }
}

class Drone extends Point {
  master: number;
  currentZone: Zone = null;
  id: number = null;
  constructor(x: number, y: number, id: number, master: number) {
    super(x, y);
    this.id = id;
    this.master = master;
  }
}

class DroneTracking {
  [playerId: number]: Drone[];
}

const overlord = new GameInformation();
Helpers.debugMode = true;
// game loop
while (true) {
  overlord.updateZoneControl();
  overlord.updateDroneTracking();
  const orders = overlord.pointsAttracting();
  overlord.excecuteOrders(orders);
}

// someguy314
//nbZones=4
//nbDrones=5
//gameSeed=1538891043141

// nbZones=4
// nbDrones=5
// gameSeed=1538926129913