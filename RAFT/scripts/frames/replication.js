
"use strict";
/*jslint browser: true, nomen: true*/
/*global define*/

define([], function () {
    return function (frame) {
        var player = frame.player(),
            layout = frame.layout(),
            model = function() { return frame.model(); },
            client = function(id) { return frame.model().clients.find(id); },
            node = function(id) { return frame.model().nodes.find(id); },
            cluster = function(value) { model().nodes.toArray().forEach(function(node) { node.cluster(value); }); },
            wait = function() { var self = this; model().controls.show(function() { self.stop(); }); },
            subtitle = function(s, pause) { model().subtitle = s + model().controls.html(); layout.invalidate(); if (pause === undefined) { model().controls.show() }; },
            clear = function() { subtitle('', false); },
            removeAllNodes = function() { model().nodes.toArray().forEach(function(node) { node.state("stopped"); }); model().nodes.removeAll(); };

        //------------------------------
        // Title
        //------------------------------
        frame.after(0, function() {
            model().clear();
            layout.invalidate();
        })
        .after(500, function () {
            frame.model().title = '<h2 style="visibility:visible">Log Replication(日志复制)</h1>'
                                + '<br/>' + frame.model().controls.html();
            layout.invalidate();
        })
        .after(200, wait).indefinite()
        .after(500, function () {
            model().title = "";
            layout.invalidate();
        })

        //------------------------------
        // Cluster Initialization
        //------------------------------
        .after(300, function () {
            model().nodes.create("A");
            model().nodes.create("B");
            model().nodes.create("C");
            cluster(["A", "B", "C"]);
            layout.invalidate();
        })
        .after(500, function () {
            model().forceImmediateLeader();
        })


        //------------------------------
        // Overview
        //------------------------------
        .then(function () {
            subtitle('<h2>一旦我们选出了领导者，领导者就需要将系统的所有更改复制到所有节点。</h2>', false);
        })
        .then(wait).indefinite()
        .then(function () {
            subtitle('<h2>这是通过使用用于检测信号的<em>附加条目</em>消息来完成的。</h2>', false);
        })
        .then(wait).indefinite()
        .then(function () {
            subtitle('<h2>让我们走一下这个过程。</h2>', false);
        })
        .then(wait).indefinite()


        //------------------------------
        // Single Entry Replication
        //------------------------------
        .then(function () {
            model().clients.create("X");
            subtitle('<h2>首先，客户向领导发送更改。</h2>', false);
        })
        .then(wait).indefinite()
        .then(function () {
            client("X").send(model().leader(), "SET 5");
        })
        .after(model().defaultNetworkLatency, function() {
            subtitle('<h2>更改会附加到领导者的日志中...</h2>');
        })
        .at(model(), "appendEntriesRequestsSent", function () {})
        .after(model().defaultNetworkLatency * 0.25, function(event) {
            subtitle('<h2>...然后在下一次心跳时将更改发送给追随者。</h2>');
        })
        .after(1, clear)
        .at(model(), "commitIndexChange", function (event) {
            if(event.target === model().leader()) {
                subtitle('<h2>一旦得到大多数追随者的确认，更改就提交成功了...</h2>');
            }
        })
        .after(model().defaultNetworkLatency * 0.25, function(event) {
            subtitle('<h2>...并且向客户端发送响应。</h2>');
        })
        .after(1, clear)
        .after(model().defaultNetworkLatency, function(event) {
            subtitle('<h2>现在，让我们发送一个命令，将值增加“2”。</h2>');
            client("X").send(model().leader(), "ADD 2");
        })
        .after(1, clear)
        .at(model(), "recv", function (event) {
            subtitle('<h2>我们的系统值现在更新为“7”。</h2>', false);
        })
        .after(1, wait).indefinite()


        //------------------------------
        // Network Partition
        //------------------------------
        .after(1, function () {
            removeAllNodes();
            model().nodes.create("A");
            model().nodes.create("B");
            model().nodes.create("C");
            model().nodes.create("D");
            model().nodes.create("E");
            layout.invalidate();
        })
        .after(500, function () {
            node("A").init();
            node("B").init();
            node("C").init();
            node("D").init();
            node("E").init();
            cluster(["A", "B", "C", "D", "E"]);
            model().resetToNextTerm();
            node("B").state("leader");
        })
        .after(1, function () {
            subtitle('<h2>Raft甚至可以在面对网络分区时保持一致。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>让我们添加一个分区把 A、B 和 C、D、E分开</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            model().latency("A", "C", 0).latency("A", "D", 0).latency("A", "E", 0);
            model().latency("B", "C", 0).latency("B", "D", 0).latency("B", "E", 0);
            model().ensureExactCandidate("C");
        })
        .after(model().defaultNetworkLatency * 0.5, function () {
            var p = model().partitions.create("-");
            p.x1 = Math.min.apply(null, model().nodes.toArray().map(function(node) { return node.x;}));
            p.x2 = Math.max.apply(null, model().nodes.toArray().map(function(node) { return node.x;}));
            p.y1 = p.y2 = Math.round(node("B").y + node("C").y) / 2;
            layout.invalidate();
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.state() === "leader");
        })
        .after(1, function () {
            subtitle('<h2>由于出现了分区，现在有两位不同的领导者。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            model().clients.create("Y");
            subtitle('<h2>让我们添加另一个客户端，并尝试更新两个领导者。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            client("Y").send(node("B"), "SET 3");
            subtitle('<h2>一个客户端将尝试将节点B的值设置为“3”。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>节点B无法复制到大多数，因此其日志条目保持未提交状态。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            var leader = model().leader(["C", "D", "E"]);
            client("X").send(leader, "SET 8");
            subtitle('<h2>另一个客户端将尝试将节点' + leader.id + '的值设置为"8"。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>这将取得成功，因为它可以复制到大多数节点。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>现在让我们修复网络分区。</h2>', false);
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            model().partitions.removeAll();
            layout.invalidate();
        })
        .after(200, function () {
            model().resetLatencies();
        })
        .at(model(), "stateChange", function(event) {
            return (event.target.id === "B" && event.target.state() === "follower");
        })
        .after(1, function () {
            subtitle('<h2>节点B将看到更高的选举任期并下台。</h2>');
        })
        .after(1, function () {
            subtitle('<h2>两个节点A和B都将回滚其未提交的条目，并匹配新领导者的日志。</h2>');
        })
        .after(1, wait).indefinite()
        .after(1, function () {
            subtitle('<h2>我们的日志现在在整个集群中是一致的。</h2>', false);
        })
        .after(1, wait).indefinite()

        .then(function() {
            player.next();
        })

        player.play();
    };
});
