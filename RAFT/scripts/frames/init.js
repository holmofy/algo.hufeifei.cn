
"use strict";
/*jslint browser: true, nomen: true*/
/*global define*/

define(["./playground", "./title", "./intro", "./overview", "./election", "./replication", "./conclusion"],
    function (playground, title, intro, overview, election, replication, conclusion) {
        return function (player) {
            // player.frame("playground", "Playground", playground);
            player.frame("home", "主页", title);
            player.frame("intro", "什么是分布式共识?", intro);
            player.frame("overview", "协议概览", overview);
            player.frame("election", "领导者选举", election);
            player.frame("replication", "日志复制", replication);
            player.frame("conclusion", "其他资源", conclusion);
        };
    });
