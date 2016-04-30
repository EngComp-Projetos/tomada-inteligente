// Data is read from select statements published by server


// myScore.addEventListener('update', function(diff, data) {
//   console.log(data[0].score);
// });

if (Meteor.isClient) {
  Session.set('idUsuario', 1);//gambiarra
  produtoUsuario = new MysqlSubscription('produtoUsuario', Session.get('idUsuario'));
  consumoProduto = new MysqlSubscription('consumoTotal', 1); //gambiarra

  Template.produtos.events({
    'click .ligado': function () {
      console.log(this.id);
        Meteor.call('changeStatus', this.id, 0);
    },
    'click .desligado': function () {
      console.log(this.id);
        Meteor.call('changeStatus', this.id, 1);
    }
  });

  Template.produtos.helpers({
    produtoUsuario: function () {
        return produtoUsuario.reactive();
    },

    consumo: function () {
      var total = 0;
      for(var i in consumoProduto.reactive()){
          if (!isNaN(consumoProduto[i].valor)){
            total += consumoProduto[i].valor;
          }
      }
      return total;
    }

  });

}

if (Meteor.isServer) {
  var liveDb = new LiveMysql({
    host: 'localhost',
    // Port 3407 as specified in leaderboard.mysql.json
    // If using external MySQL server, the default port is 3306
    port: 3306,
    user: 'root',
    password: '12345678',
    database: 'tomadaInteligente'
  });

  var closeAndExit = function() {
    liveDb.end();
    process.exit();
  };
  // Close connections on hot code push
  process.on('SIGTERM', closeAndExit);
  // Close connections on exit (ctrl + c)
  process.on('SIGINT', closeAndExit);

  // Meteor.publish('allPlayers', function() {
  //   return liveDb.select(
  //     'SELECT * FROM produto',
  //     [ { table: 'produto' } ]
  //   );
  // });

  Meteor.publish('produtoUsuario', function(id) {
    return liveDb.select(
      'SELECT * FROM produto WHERE usuario_id = ' + liveDb.db.escape(id),
      [
        {
          table: 'produto', 
          condition: function(row, newRow, rowDeleted) {
                      // newRow provided on UPDATE query events
                      return row.usuario_id === id || (newRow && newRow.usuario_id === id);
                    }
        }
      ]
    );
  });

  Meteor.publish('consumoTotal', function(idProduto) {
    return liveDb.select(
      'SELECT * FROM consumo WHERE produto_id = ' + liveDb.db.escape(idProduto),
      [
        {
          table: 'consumo', 
          condition: function(row, newRow, rowDeleted) {
                      // newRow provided on UPDATE query events
                      return row.produto_id === idProduto || (newRow && newRow.produto_id === idProduto);
                    }
        }
      ]
    );
  });


  Meteor.methods({
    'changeStatus': function(id, status) {
      check(id, Number);
      check(status, Number);

      liveDb.db.query(
        'UPDATE produto SET status = ? WHERE id = ?', [ status, id ]);
    }
  });
}
