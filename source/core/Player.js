"use strict"
/*
    OpenAgar - Open source web game
    Copyright (C) 2016 Andrew S

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const Socket = require('./socket.js')
const SkinHandler = require('./skinHandler.js')
const BinaryNodes = require('./binaryNodes.js')
var Template = require('./PlayerTemplate.js');
module.exports = class Player extends Template {
    constructor(id, socket, server, globalData) {
        super(id, server)
        this.keys = {
            w: false,
            space: false,
            e: false,
            r: false,
            t: false,
            q: false,
            f: false
        }
        this.globalData = globalData;
        this.pausem = false;
        this.nodeHash = {};
        this.moveView = [];
        this.upmoveHash = {};
        this.moveHash = {};
        this.recievePublicChat = true;
        this.mutePlayers = []

        this.timer = {
            view: 0,
            second: 0
        }
        this.buflen = 0;
        this.view = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        }
        this.lastVis = []
        this.toSend = []
        this.visSimple = []
        this.visible = []

        this.socket = new Socket(socket, this)
        this.skinHandler = new SkinHandler(this)
        this.server.addClient(this)
        this.sendData = true;



    }

    msg(m, n, c, i) {
        var color = c || {
            'r': 155,
            'g': 155,
            'b': 155
        };
        var id = i || -1
        var name = n || "[OpenAgar]"
        this.socket.emit('chat', {
            color: color,
            name: name,
            msg: m,
            id: id
        })
    }

    kick(reason) {
        if (!reason) reason = "You have been kicked from the server";
        this.socket.emit('kicked', reason)
        this.socket.disconnect()

    }
    onChat(msg) {
        this.server.addChat(this, msg)

    }
    changeServers(id, servers) {

        if (!id) return

        if (!servers.servers.get(id)) {

            return false;
        }
        if (this.server) this.server.removeClient(this)

        this.server = servers.servers.get(id);
        this.reset()
        this.server.addClient(this)
        this.init()
    }
    reset() {
        this.resetView()
        this.minions.clear();
        this.cells.clear();
        this.visible = [];
        this.gameData = {
            name: "",
            color: this.server.getRandomColor(),
            chatColor: this.server.getRandomColor(),
            reservedChatNames: [],
            chatName: "",
            chkDeath: false,
            chatBan: false,
            reservedNamesMap: []
        }
        this.owning.clear()

        this.sendData = false;
    }
    init() {

    }
    recmouse(data) {

        if (!data) return;
        try {
            data = data.split("|")
            var x = parseInt(data[0])
            var y = parseInt(data[1])
            if (!isNaN(x)) this.mouse.x = x;
            if (!isNaN(x)) this.mouse.y = y
        } catch (e) {
         //   console.log(e)
        }
    }
    addCell(cell) {
        this.cells.set(cell.id, cell)
        this.socket.emit('mes', {
            type: "addNode",
            id: cell.id
        })
    }


    checkKeys(main) {
        if (this.keys.space) {
            this.keys.space = false;
            if (this.PEvent('onPressSpace', {
                    player: this
                }) && this.GMEvent('pressSpace', {
                    player: this
                })) main.splitPlayer(this)

        }
        if (this.keys.w) {
            this.keys.w = false;
            if (this.PEvent('onPressW', {
                    player: this
                }) && this.GMEvent('pressW', {
                    player: this
                })) main.ejectMass(this)
        }
        if (this.keys.e) {
            this.keys.e = false;
            if (this.PEvent('onPressE', {
                    player: this
                }) && this.GMEvent('pressE', {
                    player: this
                })) {
                this.minions.forEach((minion) => {
                    main.splitPlayer(minion)
                })

            }
        }
        if (this.keys.r) {
            this.keys.r = false;
            if (this.PEvent('onPressR', {
                    player: this
                }) && this.GMEvent('pressR', {
                    player: this
                })) {
                this.minions.forEach((minion) => {
                    main.ejectMass(minion)
                })
            }
        }
        if (this.keys.t) {
            this.keys.t = false;
            if (this.PEvent('onPressT', {
                    player: this
                }) && this.GMEvent('pressT', {
                    player: this
                })) {
                this.pausem = !this.pausem
                this.minions.forEach((minion) => {
                    minion.frozen = this.pausem
                })
            }
        }
        if (this.keys.q) {
            this.keys.q = false;
            this.PEvent('onPressQ', {
                player: this
            })
            this.GMEvent('pressQ', {
                player: this
            })
        }
        if (this.keys.f) {
            this.keys.f = false;
            if (this.PEvent('onPressF', {
                    player: this
                }) && this.GMEvent('pressF', {
                    player: this
                })) {}

            this.server.shootBullet(this)
        }
    }
    PEvent(e, d) {
        if (!this.server) return true;
        return this.server.pluginService.send(e, d)
    }
    GMEvent(e, d) {
        if (!this.server) return true;
        return this.server.gameMode.event(e, d)
    }
    pressKey(id) {
        // console.log(id)
        id = parseInt(id)

        switch (id) {
        case 32: // space
            this.keys.space = true
            break;
        case 81: // q
            this.keys.q = true
            break;
        case 87: // w
            this.keys.w = true
            break;
        case 69: // e
            this.keys.e = true;
            break;
        case 82: // r
            this.keys.r = true;
            break;
        case 84: // t
            this.keys.t = true;
            break;
        case 27: // esc
            break;
        case 70: // f
            this.keys.f = true;
            break;

        }


    }

    onmsg(msg, servers) {
        if (!msg || !msg.type) return;
        switch (msg.type) {
        case "play":

            if (this.cells.size > 0) return;
            this.sendData = true;
            this.bulletsleft = 3
            this.golden = false;
            this.resetView()
            var name = msg.name || ""
            if (!msg.skin) name = this.skinHandler.setSkin(name);
            else if (msg.skin > 0)
                this.skinHandler.skin = msg.skin
            this.setName(name);
            this.socket.emit('mes', {
                type: "clearNodes"
            })
            this.server.spawn(this)
            this.resetView()

            break;
        case "chat":
            servers.chat(msg.chat, this.server)
            break;
        case "key":
            this.pressKey(msg.id)
            break;

        }

    }
    resetView() {
        this.nodeHash = {};
        this.moveView = [];
        this.upmoveHash = {};
        this.moveHash = {};


        this.view = {};

    }

    calcView() {

        if (this.cells.size == 0) return
        var totalSize = 1.0;
        var x = 0,
            y = 0;
        this.cells.forEach((cell) => {
            if (!cell) return
            x += cell.position.x
            y += cell.position.y
            totalSize += cell.getSize();
        })
        this.center.x = x / this.cells.size
        this.center.y = y / this.cells.size
        var factor = Math.pow(Math.min(64.0 / totalSize, 1), 0.4);
        this.sightRangeX = this.server.getConfig().serverViewBaseX / factor;
        this.sightRangeY = this.server.getConfig().serverViewBaseY / factor;
        this.view.x = this.center.x - this.sightRangeX;

        this.view.y = this.center.y - this.sightRangeY;
        this.view.height = this.sightRangeY * 2
        this.view.width = this.sightRangeX * 2
            //  console.log({x:this.view.x,y:this.view.y,width: this.view.width,height:this.view.height})
    }
    doesFit(node) {
        var posX = node.position.x
        var posY = node.position.y
        var top = this.view.y
        var bottom = this.view.y + this.view.height
        var left = this.view.x
        var right = this.view.x + this.view.width
        if (posX < left) {
            // console.log("x:lef " + posX + "<" + left)
            return false;
        }
        if (posX > right) {
            // console.log("x:rig " + posX + ">" + right)
            return false;
        }
        if (posY > bottom) {
            //  console.log("y:bot " + posY + "<" + bottom)
            return false;
        }
        if (posY < top) {
            // console.log("y:top " + posY + ">" + top)
            return false;
        }
        return true
    }
    sendNode(node, main) {

        var n = main.formatNode(node, this);
        this.buflen += 16 + n.name.length + (n.skin.length / 2);

        // this.visSimple.push(n)

        //  if (this.lastVis.indexOf(JSON.stringify(n)) == -1)

        this.toSend.push(n)

    }
    sendDelNode(node) {
        this.toSend.push({
            _type: 2,
            id: node.id
        })
        this.buflen += 2.5;
    }
    onDisconnect() {

        this.sendData = false;
        this.server.removeClient(this)
        this.minions.forEach((minion) => {
            this.server.removeMinion(minion)
        })
        this.minions = []
    }
    onDeath(killer) {
        this.killer = (killer && killer.owner) ? killer.owner : false;

        this.mass = 0;
        this.score = 0;

        this.socket.emit('rip', {
            alive: this.server.timer.time - this.alive,
            killerId: (killer && killer.owner) ? killer.owner.id : -1
        })
        this.alive = this.server.timer.time;


        setTimeout(function () { // let the player see who killed them
            if (this.cells.size > 0) return
            this.sendData = false;

        }.bind(this), 10000)
    }
    send() {

        if (this.toSend.length == 0) return;
        this.socket.sendNodes(BinaryNodes(this.toSend, this.buflen))
        this.toSend = [];
        this.buflen = 0;
    }
    sendMoveUpt(node) {

        this.toSend.push({
            _type: 1,
            id: node.id,
            x: node.position.x,
            y: node.position.y
        })
        this.buflen += 6.5;
    }
    update(main) { // every 0.02 sec

        if (!this.sendData) return;

        if (main.toBeDeleted.length > 0) this.deleteNodes(main);

        if (this.timer.view >= 5) { // 0.1 sec update clients (6 fps)
            this.checkKeys(main)
            this.calcView()
            var hash = this.server.getWorld().getNodes('hash');



            this.timer.view = 0;


            if (!this.view) return;
            this.visible = [];
            this.toSend = [];



            var hashtable = {};
            hash.forEach(this.view, (node) => {
                if (node.dead) return;
                if (!this.doesFit(node)) return;
                this.visible.push(node)
                hashtable[node.id] = true;
                if (node.moving && !this.moveHash[node.id] && !this.cells.get(node.id)) {
                    this.moveView.push(node)
                    this.moveHash[node.id] = true;

                }


                if (this.nodeHash[node.id] == node.updateCode) {
                    if (this.upmoveHash[node.id] != node.moveCode) {
                        this.sendMoveUpt(node);

                        return;
                    }
                    return;
                }
                this.upmoveHash[node.id] = node.moveCode;
                this.nodeHash[node.id] = node.updateCode;
                this.sendNode(node, main)

            });
            /*
        this.cells.forEach((node)=>{
            if (!this.doesFit(node) || this.visible.indexOf(node) != -1) return;
         this.sendNode(node,main)
            this.visible.push(node)
        })
       
        */
            var splist = [];
            this.moveView.forEach((node, id) => {
                if (node.dead || !node.moving) {
                    splist.push(id)
                    this.moveHash[node.id] = false;
                    this.upmoveHash[node.id] = false;
                    //  this.nodeHash[node.id] = node.updateCode;
                } else if (this.doesFit(node)) {


                } else {

                    splist.push(id)
                    this.moveHash[node.id] = false;
                    this.sendDelNode(node)
                        //  console.log("del",node.id)
                    this.upmoveHash[node.id] = false;
                    //      this.nodeHash[node.id] = false;
                }

            })
            var buf = 0;
            splist.forEach((id) => {
                this.moveView.splice(id - buf, 1)
                buf++;
            })
            if (this.killer && this.killer.cells.size > 0) {
                if (this.killer.isBot) {
                    var a = this.killer.cells.peek().position;
                } else {
                    var a = this.killer.center;

                }
                this.socket.emit('killer', a)
            }
            this.lastVis = this.visSimple;
            this.visSimple = [];

            this.send();
        } else {
            this.timer.view++;
        }
    }

    deleteNodes(main) {

        this.socket.sendDelete(main.deleteR)
    }
}
