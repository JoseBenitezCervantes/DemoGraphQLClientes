//JoseBenitez wD5p8xfHHXGQEhTc
const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const Cliente = require("../models/Cliente");
const Pedido = require("../models/Pedido");
require("dotenv").config({ path: "variables.env" });
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;
  return jwt.sign({ id, email, nombre, apellido }, secreta, {
    expiresIn,
  });
};
const resolvers = {
  Query: {
    obtenerUsuario: async (_, {}, ctx) => {
      return ctx.usuario;
    },
    obtenerProductos: async () => {
      try {
        const resultado = await Producto.find();
        return resultado;
      } catch (error) {
        console.log("error", error);
      }
    },
    obtenerProducto: async (_, { id }) => {
      const resultado = await Producto.findById(id);
      if (!resultado) {
        throw new Error("El producto no existe ");
      }
      return resultado;
    },
    obtenerClientes: async () => {
      try {
        const resultado = await Cliente.find({});
        return resultado;
      } catch (error) {
        console.log("error", error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      console.log(ctx.usuario.id.toString());
      try {
        const clientes = await Cliente.find({
          vendedor: ctx.usuario.id.toString(),
        });
        return clientes;
      } catch (error) {
        console.log("erro r", error);
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      const resultado = await Cliente.findById(id);
      if (!resultado) {
        throw new Error("El Cliente no existe ");
      }
      if (resultado.vendedor.toString() != ctx.usuario.id) {
        throw new Error("No tienes crdenciales");
      }
      return resultado;
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({
          vendedor: ctx.usuario.id,
        }).populate("cliente");
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no existe");
      }
      if (pedido.vendedor.toString() != ctx.usuario.id) {
        throw new Error("No tienes crdenciales");
      }
      return pedido;
    },
    obtenerPedidoEstado: async (_, { estado }, ctx) => {
      try {
        const pedidos = await Pedido.find({ estado, vendedor: ctx.usuario.id });
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$cliente",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $limit: 10,
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return clientes;
    },
    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return vendedores;
    },
    buscarProductos: async (_, { texto }) => {
      const producto = await Producto.find({ $text: { $search: texto } }).limit(
        10
      );

      return producto;
    },
  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;
      const existeUsuario = await Usuario.findOne({ email });

      if (existeUsuario) {
        throw new Error("El usuario ya existe");
      }

      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt);
      try {
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log("error", error);
      }
    },
    autenticarUsuario: async (_, { input }) => {
      //Si el usuario existe
      const { email, password } = input;
      const existeUsuario = await Usuario.findOne({ email });

      if (!existeUsuario) {
        throw new Error("El usuario no existe");
      }

      const passwordCorrecto = await bcryptjs.compare(
        password,
        existeUsuario.password
      );

      if (!passwordCorrecto) throw new Error("Password Incorrecto");

      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "24h"),
      };
    },
    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);

        //Almacenar en BD
        const resultado = await producto.save();

        return resultado;
      } catch (error) {
        console.log("error ", error);
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      let resultado = await Producto.findById(id);
      if (!resultado) {
        throw new Error("El producto no existe");
      }
      resultado = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return resultado;
    },
    eliminarProducto: async (_, { id }) => {
      let resultado = await Producto.findById(id);
      if (!resultado) {
        throw new Error("El producto no existe");
      }
      resultado = await Producto.findByIdAndDelete({ _id: id });
      return "Producto Eliminado";
    },
    nuevoCliente: async (_, { input }, ctx) => {
      const { email } = input;
      const existeCliente = await Cliente.findOne({ email });

      if (existeCliente) {
        throw new Error("El Cliente ya existe");
      }
      const cliente = new Cliente(input);
      cliente.vendedor = ctx.usuario.id;

      try {
        cliente.save();
        return cliente;
      } catch (error) {
        console.log("error", error);
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El Cliente no existe ");
      }
      if (cliente.vendedor.toString() != ctx.usuario.id) {
        throw new Error("No tienes crdenciales");
      }

      cliente = Cliente.findOneAndUpdate({ _id: id }, input, { new: true });
      return cliente;
    },
    eliminarCliente: async (_, { id }, ctx) => {
      // Verificar si existe o no
      let cliente = await Cliente.findById(id);

      if (!cliente) {
        throw new Error("Ese cliente no existe");
      }

      // Verificar si el vendedor es quien edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      // Eliminar Cliente
      await Cliente.findOneAndDelete({ _id: id });
      return "Cliente Eliminado";
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input;

      // Verificar si existe o no
      let clienteExiste = await Cliente.findById(cliente);

      if (!clienteExiste) {
        throw new Error("Ese cliente  no existe");
      }

      // Verificar si el cliente es del vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      // Revisar que el stock este disponible
      for await (const articulo of input.pedido) {
        const { id } = articulo;

        const producto = await Producto.findById(id);

        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El articulo: ${producto.nombre} excede la cantidad disponible`
          );
        } else {
          // Restar la cantidad a lo disponible
          producto.existencia = producto.existencia - articulo.cantidad;

          await producto.save();
        }
      }

      // Crear un nuevo pedido
      const nuevoPedido = new Pedido(input);

      // asignarle un vendedor
      nuevoPedido.vendedor = ctx.usuario.id;

      // Guardarlo en la base de datos
      const resultado = await nuevoPedido.save();
      return resultado;
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      const { cliente } = input;

      // Si el pedido existe
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("El pedido no existe");
      }

      // Si el cliente existe
      const existeCliente = await Cliente.findById(cliente);
      if (!existeCliente) {
        throw new Error("El Cliente no existe");
      }

      // Si el cliente y pedido pertenece al vendedor
      if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      // Revisar el stock
      if (input.pedido) {
        for await (const articulo of input.pedido) {
          const { id } = articulo;

          const producto = await Producto.findById(id);

          if (articulo.cantidad > producto.existencia) {
            throw new Error(
              `El articulo: ${producto.nombre} excede la cantidad disponible`
            );
          } else {
            // Restar la cantidad a lo disponible
            producto.existencia = producto.existencia - articulo.cantidad;

            await producto.save();
          }
        }
      }

      // Guardar el pedido
      const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return resultado;
    },
    eliminarPedido: async (_, { id }, ctx) => {
      console.log("id", id);
      // Verificar si existe o no
      let pedido = await Pedido.findById(id);

      if (!pedido) {
        throw new Error("Ese pedido no existe");
      }

      // Verificar si el vendedor es quien edita
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      // Eliminar Cliente
      await Pedido.findOneAndDelete({ _id: id });
      return "Pedido Eliminado";
    },
  },
};

module.exports = resolvers;
