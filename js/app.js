var app = angular.module("app", ['ngStorage']);

app.controller("home", function($scope, $http, $localStorage) {
    this.data = [];
    this.home = [];
    this.away = [];
    this.temp = [];
    this.arrows = [];
    this.planSheet = ['3-5-2', '3-4-3', '4-4-2', '4-3-3', '4-4-1-1', '4-2-3-1', '4-3-2-1', '4-1-3-2', '5-3-2', '5-4-1']
    this.toggleMenuBar = false

    this.flag_attack = 0;
    this.ball = { position: { top: "49%", left: "calc(50% - 15px)" } };
    this.isMobile =
        new MobileDetect(window.navigator.userAgent).mobile() != null ?
        true :
        false;

    init = async() => {
        console.log($localStorage.profiles)
        this.profiles = $localStorage.profiles || [];
        this.profileRecent = $localStorage.recentName || "./json/default.json";
        await this.load(this.profileRecent);
        await this.draw();
    };

    this.loadUrl = async(url) => {
        const params = btoa(url)
        await $http
            .get("http://iboommm.com:6060/livescore/" + params)
            .then((res) => {
                console.log(res.data);
                const data = res.data;
                let playersHome = _.compact(data.Lu[0].Ps.map(player => {
                    if (player.Pon != 'SUBSTITUTE_PLAYER' && player.Pon != 'COACH') {
                        return { name: player.Shnm, number: player.Snu }
                    }
                }))

                let subHome = _.compact(data.Lu[0].Ps.map(player => {
                    if (player.Pon == 'SUBSTITUTE_PLAYER') {
                        return { name: player.Shnm, number: player.Snu }
                    }
                }))

                let playersAway = _.compact(data.Lu[1].Ps.map(player => {
                    if (player.Pon != 'SUBSTITUTE_PLAYER' && player.Pon != 'COACH') {
                        return { name: player.Shnm, number: player.Snu }
                    }
                }))
                let subAway = _.compact(data.Lu[1].Ps.map(player => {
                    if (player.Pon == 'SUBSTITUTE_PLAYER') {
                        return { name: player.Shnm, number: player.Snu }
                    }
                }))

                playersHome = this.processLineUp(data.Lu[0].Fo.join("-"), playersHome)
                playersAway = this.processLineUp(data.Lu[1].Fo.join("-"), playersAway)
                playersAway = playersAway.map(role => {
                    return role.reverse()
                })

                let temp = {
                    "teamHome": {
                        "name": data.T1[0].Nm,
                        "plan": data.Lu[0].Fo.join("-"),
                        "players": playersHome,
                        "subs": subHome
                    },
                    "teamAway": {
                        "name": data.T2[0].Nm,
                        "plan": data.Lu[1].Fo.join("-"),
                        "players": playersAway,
                        "subs": subAway
                    }
                }
                console.log(temp)
                this.data = temp;
                this.arrows = [];
                this.draw()
            })
            .catch((e) => console.log(e));
    };


    this.processLineUp = (planString, players) => {
        let plan = planString.split("-").map((a) => parseInt(a));
        let start = 0;
        let newLineUp = _.clone(players).map((player, key) => {
            if (key == 0) {
                return [{...player }];
            } else {
                let tmp = [];
                start += plan[0];
                for (let i = 0; i < plan[0]; i++) {
                    tmp.push({...players[start + i - plan[0] + 1] });
                }

                plan.shift();
                return tmp;
            }
        });
        return _.compact(_.map(newLineUp, (x) => (x.length > 0 ? x : false)));
    }

    this.load = async(url) => {
        await $http
            .get(url)
            .then((res) => {
                this.data = res.data;
                this.temp = _.clone(res.data);
                $scope.$applyAsync();
            })
            .catch((e) => console.log(e));
    };

    this.loadTemplate = async(url) => {
        await this.load(url);
        await this.draw();
        $localStorage.recentName = url
        $("#loadTemplate").modal('hide');
    }

    this.loadTemplateByCache = (template) => {
        this.data = _.clone(template.data);
        console.log(template.data)
        if ("ball" in this.data) {
            $(".ball").css(this.data.ball.position);
            console.log("loaded ball")
        }

        if ("arrows" in this.data) {
            this.arrows = _.clone(this.data.arrows)
            console.log("loaded arrows")
            this.arrows.forEach((arrow, key) => {
                setTimeout(() => {
                    const red = arrow.position2.transform.match(/[-]{0,1}[\d]*[.]{0,1}[\d]+/g, '')[0]
                    console.log(red)
                    $(".arrow-" + key + "> .arrow-rotate").rotatable({
                        stop: handleArrowDragStop,
                        angle: parseFloat(red)
                    });
                    $(".arrow-" + key).draggable({
                        stop: handleArrowDragStop
                    });
                }, 200)
            })

        }
        $scope.$applyAsync();
        this.draw()
        $('#loadTemplate').modal("hide")
    }

    this.reset = () => {
        this.data = _.clone(this.temp);
        $(".ball").css({ top: "49%", left: "calc(50% - 15px)" });
        $scope.$applyAsync();
        this.draw();
        this.arrows = []
    };

    this.swap = () => {
        this.data = {
            teamHome: _.clone(this.temp).teamAway,
            teamAway: _.clone(this.temp).teamHome,
        };
        this.draw();
    };

    this.arrowMenu = false;
    this.toggleArrowMenu = () => {
        this.toolsMenu = false;
        this.arrowMenu = !this.arrowMenu
    }

    this.loadTemplatePopup = () => {
        $("#loadTemplate").modal();
    }

    this.templateNameCache = ""
    this.saveTemplatePopup = () => {
        $("#saveTemplate").modal();
    }

    this.loadLineUpPopup = () => {
        $("#loadLineUp").modal();
    }

    this.urlLineup = ""
    this.importLineup = async() => {
        await this.loadUrl(this.urlLineup)
        $("#loadLineUp").modal('hide');
    }

    this.saveTemplateConfirm = () => {
        const playersHome = JSON.parse(angular.toJson(this.getPlanLineUp('home')));
        const playersAway = JSON.parse(angular.toJson(this.getPlanLineUp('away')));
        const temp = {
            "teamHome": {
                "name": this.home.name,
                "plan": this.home.plan,
                "players": playersHome,
                "subs": this.home.subs
            },
            "teamAway": {
                "name": this.away.name,
                "plan": this.away.plan,
                "players": playersAway,
                "subs": this.away.subs
            },
            "ball": {...this.ball },
            "arrows": this.arrows
        }
        if (typeof $localStorage.profiles != 'object') {
            $localStorage.profiles = [];
        }
        $localStorage.profiles.push({ name: this.templateNameCache, data: temp })
        this.templateNameCache = ""
        $("#saveTemplate").modal('hide');
    }

    this.toolsMenu = false;
    this.toggleToolsMenu = () => {
        this.arrowMenu = false;
        this.toolsMenu = !this.toolsMenu
    }

    this.addArrow = (mode) => {
        const randLeft = Math.floor(Math.random() * 160) + 31;
        console.log(randLeft)
        this.arrows.push({ mode, position: { left: randLeft + "px", top: "529px", transform: 'rotate(1.07174rad)' } })
        setTimeout(() => {
            $(".arrow-rotate").rotatable({
                stop: handleArrowDragStop
            });
            $(".arrow").draggable({
                stop: handleArrowDragStop
            });
        }, 200)
    }

    this.removeArrow = (arrow) => {
        _.remove(this.arrows, a => a === arrow)
    }

    this.removeData = (arr, data) => {
        _.remove(arr, a => a == data)
    }

    this.draw = async(
        mode = "normal",
        plan = { side: "", value: "", players: [] }
    ) => {
        this.home.players = (plan.side == "home" && plan.players.length > 0) ? plan.players : Object.values(this.data.teamHome.players);
        this.home.plan = (plan.side == "home" && plan.value != "") ? plan.value : this.data.teamHome.plan;

        this.home.subs = this.data.teamHome.subs;
        this.home.name = this.data.teamHome.name;
        delete this.home.players["$$hashKey"];

        let playerHome = [];

        if (this.home.players.length > 4) {
            playerHome = this.drawPlayer(true, true, mode);
        } else {
            playerHome = this.drawPlayer(true, false, mode);
        }

        // away
        this.away.players = (plan.side == "away" && plan.players.length > 0) ? plan.players : Object.values(this.data.teamAway.players);
        this.away.plan = (plan.side == "away" && plan.value != "") ? plan.value : this.data.teamAway.plan;
        this.away.subs = this.data.teamAway.subs;
        this.away.name = this.data.teamAway.name;

        delete this.away.players["$$hashKey"];

        let playerAway = [];
        if (this.away.players.length > 4) {
            playerAway = this.drawPlayer(false, true, mode);
        } else {
            playerAway = this.drawPlayer(false, false, mode);
        }

        this.home.players = playerHome;
        this.away.players = playerAway;

        await $scope.$applyAsync();
        setTimeout(() => {
            $(".player").draggable({
                containment: "#container-field",
                cursor: "move",
                snap: "#container-field",
                stop: handleDragStop,
            });
            console.log("set dragable for player");
        }, 200);
    };

    this.drawPlayer = (isHome, isOverPlan, mode = '') => {
        let temp = isHome ? this.home : this.away;
        console.log("temp", temp)
        let planLength = isOverPlan ? 9 : 9;
        let playerTemp = [];
        let layerCount = 0;

        if (mode == "attack" && isHome && !isOverPlan) {
            planLength = 16;
        }
        if (mode == "attack" && isHome && isOverPlan) {
            planLength = 18;
        }
        if (mode == "attack" && !isHome) {
            planLength = 9;
        }

        if (mode == "attack" && !isHome && isOverPlan) {
            planLength = 8;
        }

        const gkTop = isHome ? 5 : 90;
        for (role of temp.players) {
            if (layerCount++ === 0) {
                playerTemp.push({
                    ...role[0],
                    position: role[0]['position'] ? role[0]['position'] : { top: gkTop + "%", left: "calc(50% - 10px)" },
                });
            } else {
                let block = 100 / role.length;
                let playerCount = 0;
                for (player of role) {
                    if (isHome)
                        console.log("role", role)
                    let height = Math.abs(
                        (isHome ? 5 : 100) -
                        layerCount * (planLength * (!isOverPlan ? 1.15 : 1))
                    );
                    let left = ++playerCount * block - block / 2;

                    if (player.name.split(" ").length > 1) {
                        let startCharacter = player.name.substring(
                            name.lastIndexOf(" ") + 1,
                            1
                        );
                        player.name = startCharacter + ". " + player.name.split(" ")[1];
                    }
                    playerTemp.push({
                        ...player,
                        position: (mode == '' && player['position']) ? player.position : { top: height + "%", left: "calc(" + left + "% - 10px)" },
                    });
                }
            }
        }
        console.log("playerTemp", playerTemp)
        return playerTemp;
    };

    this.changePlan = (side) => {

        let plan = this[side].plan.split("-").map((a) => parseInt(a));
        console.log("change plan to", plan)
        let start = 0;
        let newLineUp = _.clone(this[side].players).map((player, key) => {
            if (key == 0) {
                return [{...player }];
            } else {
                let tmp = [];
                start += plan[0];
                for (let i = 0; i < plan[0]; i++) {
                    tmp.push({...this[side].players[start + i - plan[0] + 1] });
                }

                plan.shift();
                return tmp;
            }
        });
        newLineUp = _.compact(_.map(newLineUp, (x) => (x.length > 0 ? x : false)));
        this.draw("normal", { side, value: this[side].plan, players: newLineUp });
    };

    this.getPlanLineUp = (side) => {
        let plan = this[side].plan.split("-").map((a) => parseInt(a));
        let start = 0;
        let newLineUp = _.clone(this[side].players).map((player, key) => {
            if (key == 0) {
                return [{...player }];
            } else {
                let tmp = [];
                start += plan[0];
                for (let i = 0; i < plan[0]; i++) {
                    tmp.push({...this[side].players[start + i - plan[0] + 1] });
                }

                plan.shift();
                return tmp;
            }
        });
        return _.compact(_.map(newLineUp, (x) => (x.length > 0 ? x : false)));
    }

    this.teamSwap = [];
    this.teamSwapSide = "";
    this.teamSwapPick = "";
    this.teamSwapKey = -1;
    this.swapPlayer = (team, pick, key) => {
        if (this.teamSwapKey == -1) {
            this.teamSwap = team == "home" ? this.home : this.away;
            this.teamSwapSide = team;
            this.teamSwapPick = pick;
            this.teamSwapKey = key;
        } else {
            const hold = this.teamSwap[this.teamSwapPick][this.teamSwapKey].name;
            const replace = this.teamSwap[pick][key].name;
            this.teamSwap[this.teamSwapPick][this.teamSwapKey].name = replace;
            this.teamSwap[pick][key].name = hold;

            this.teamSwap = [];
            this.teamSwapSide = "";
            this.teamSwapPick = "";
            this.teamSwapKey = -1;
        }
    };

    handleArrowDragStop = (event, ui) => {
        let findArrow = _.map(_.split(event.target.outerHTML, " "), x => {
            if (_.startsWith(x, "arrow-")) {
                return x;
            } else {
                return false;
            }
        })
        try {
            findArrow = _.compact(findArrow)[1].split("-")
            const key = parseInt(findArrow[1])
            if ('angle' in ui) {
                console.log(ui.angle.current)
            } else {
                const offsetXPos = parseInt(ui.position.left) || 0;
                const offsetYPos = parseInt(ui.position.top) || 0;
                this.arrows[key].position = { top: offsetYPos + "px", left: offsetXPos + "px", transform: ui.helper[0].style.transform }
            }
        } catch (e) {
            let findArrow = _.compact(_.map(event.target.parentElement.classList, x => {
                if (_.startsWith(x, "arrow-")) {
                    return x;
                } else {
                    return false;
                }
            }))[1].split("-")
            const key = parseInt(findArrow[1])
            this.arrows[key].position2 = { transform: "rotate(" + ui.angle.current + "rad)" }
        }


    }


    handleDragStop = (event, ui) => {
        const offsetXPos = parseInt(ui.position.left);
        const offsetYPos = parseInt(ui.position.top);
        let findPlayer = _.map(_.split(event.target.outerHTML, " "), x => {
            if (_.startsWith(x, "player")) {
                return x;
            } else {
                return false;
            }
        })
        try {
            findPlayer = _.compact(findPlayer)[1].split("-")
            const side = findPlayer[1]
            const key = findPlayer[2]
            console.log("before", this[side].players[key])
            this[side].players[key] = {
                ...this[side].players[key],
                position: { top: offsetYPos + "px", left: offsetXPos + "px" }
            }

        } catch {
            console.log(offsetXPos, offsetYPos)
            this.ball = {
                position: { top: offsetYPos + "px", left: offsetXPos + "px" }
            }
        }

        $scope.$applyAsync();

    }

    angular.element(document).ready(function() {
        setTimeout(() => {
            $(".player").draggable({
                containment: "#container-field",
                cursor: "move",
                snap: "#container-field",
                stop: handleDragStop,
            });
            console.log("set dragable for player");
        }, 200);

        $(".ball").draggable({
            containment: "#container-field",
            cursor: "move",
            snap: "#container-field",
            stop: handleDragStop,
        });


    });

    init();
});