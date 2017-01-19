var express = require('express');
var util = require("util");

var WebServer = {
    init: function () {
        this.app = express();
        this.app.use(express.bodyParser());

        this.app.get('/packages', function(req, res){
            this.pkg.findAll({order: 'name DESC'}).then(function(packages) {
                res.send(packages);
            });
        }.bind(this));

        this.app.post('/packages', function (req, res) {
          var name, url, pkg;
          name = req.param('name');
          url = req.param('url');
          pkg = this.pkg.build({name: name, url: url});
          pkg.validate().then(function(errors){
              if(!errors){
                pkg.save().then(function () {
                  res.send(201);
                }).catch(function (e) {
                  res.send(406);
                });
              }
              else{
                console.log(errors);
                res.send(400);
              }
          });
        }.bind(this));

        this.app.get('/packages/:name', function (req, res) {
          var name = req.params.name;
          this.pkg.find({where: ["name = ?", name]}).then(function(pkg) {
            if(pkg){
              pkg.hit();
              res.send(pkg.toJSON());
            }
            else{
              res.send(404);
            }
          });
        }.bind(this));

        this.app.get('/packages/search/:name', function (req, res) {
          var name = req.params.name;
          this.pkg.findAll({where: ["name ilike ?", '%'+name+'%'], order: 'name DESC'}).then(function(packages) {
            res.send(packages);
          });
        }.bind(this));
        return this;
    },
    listen: function (port) {
        this.pkg = this.app.get('pkg');
        this.app.listen(port);
        return this;
    }
};

module.exports = Object.create(WebServer);
