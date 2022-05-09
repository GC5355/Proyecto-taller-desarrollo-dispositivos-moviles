function display_toast(mensaje, header, color) {
    const toast = document.createElement('ion-toast');
    toast.header = header;
    toast.icon = 'information-circle';
    toast.position = 'top';
    toast.message = mensaje;
    toast.duration = 3000;
    toast.color = color;
    document.body.appendChild(toast);
    toast.present();
}

function getParam(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

async function obtenerGeolocalizacion() {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Geolocation')) {
        return await Capacitor.Plugins.Geolocation.getCurrentPosition();
    }
    else {
        throw 'Geolocation no disponible';
    }
}
var map;

var map_cal;
var map_ciudad_cercana;

async function cerrar_sesion() {
    const alerta = await alertController.create({
        header: 'App Locales',
        subHeader: 'Cerrar Sesión',
        message: '¿Seguro que desea cerrar sesión?',
        buttons: [
            {
                text: 'SI',
                handler: function () {
                    let router1 = document.querySelector('ion-router');
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('usuario');
                    localStorage.removeItem('token')
                    router1.push('/');
                    display_toast('Sesi&oacute;n ha finalizado correctamente', 'Info', 'primary');
                }
            },
            {
                text: 'NO',
            }
        ]
    });
    await alerta.present();
}

function login(data, router) {
    const recordar = document.getElementById("recordar-pass");
    if (recordar.checked) {
        localStorage.setItem('token', data.apiKey)
        localStorage.setItem('usuarioId', data.id)
    } else {
        localStorage.removeItem('token')
        localStorage.setItem('usuarioId', data.id)
    }
    sessionStorage.setItem("token", data.apiKey);
    sessionStorage.setItem("usuarioId", data.id)
    router.push('/listadoEnvios');
}

function chequear_login(router) {
    const token = localStorage.getItem('token');
    const usuarioId = localStorage.getItem("usuarioId")
    if (token) {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem("usuarioId", usuarioId);
        router.push('/listadoEnvios')
    }
}

function registro(data, router) {
    sessionStorage.setItem("token", data.apiKey);
    sessionStorage.setItem("usuarioId", data.id)
    router.push('/listadoEnvios');
}

function agregar_envio() {
    try {
        const urlCiudades = 'https://envios.develotion.com/ciudades.php';
        fetch(urlCiudades, {
            method: 'GET',
            headers: {
                "Content-type": "application/json",
                "apikey": sessionStorage.getItem("token")
            }
        }).then(respuesta => respuesta.json())
            .then(data => cargar_ciudades(data))


        const urlCategorias = 'https://envios.develotion.com/categorias.php';
        fetch(urlCategorias, {
            method: 'GET',
            headers: {
                "Content-type": "application/json",
                "apikey": sessionStorage.getItem("token")
            }
        }).then(respuesta => respuesta.json())
            .then(data => cargar_categorias(data))

    } catch (e) {
        display_toast(e, 'Info', 'primary');
    }
}

function cargar_ciudades(data) {
    let ciudades_origen = document.getElementById("sel_ciudad_origen");
    let ciudad_destino = document.getElementById("sel_ciudad_destino");

    for (let i = 0; i < data.ciudades.length; i++) {
        const ciudad = data.ciudades[i];
        ciudades_origen.innerHTML += `<ion-select-option value="${ciudad.id}">${ciudad.nombre}</ion-select-option>`
        ciudad_destino.innerHTML += `<ion-select-option value="${ciudad.id}">${ciudad.nombre}</ion-select-option>`
    }
}

function cargar_categorias(data) {
    let envio_categoria = document.getElementById("sel_categoria");

    for (let i = 0; i < data.categorias.length; i++) {
        const categoria = data.categorias[i];
        envio_categoria.innerHTML += `<ion-select-option value="${categoria.id}">${categoria.nombre}</ion-select-option>`
    }
}


function calcular_precio_envio() {
    let enviar = false;
    try {
        const urlCiudades = 'https://envios.develotion.com/ciudades.php';
        fetch(urlCiudades, {
            method: 'GET',
            headers: {
                "Content-type": "application/json",
                "apikey": sessionStorage.getItem("token")
            }
        }).then(respuesta => respuesta.json())
            .then(data => obtener_latitud_longitud_calcular_precio(data, enviar))

    } catch (e) {
        display_toast(e, 'Info', 'primary');
    }


}


function obtener_latitud_longitud_calcular_precio(data, enviar) {
    let latEnvio1;
    let latEnvio2;
    let longEnvio1;
    let longEnvio2;
    let distanciaEnvio;
    let distanciaCal;

    let ciudad_envio_1 = Number(document.getElementById('sel_ciudad_origen').value);
    let ciudad_envio_2 = Number(document.getElementById('sel_ciudad_destino').value);
    let idCategoriaEnvio = Number(document.getElementById('sel_categoria').value);


    for (let i = 0; i < data.ciudades.length; i++) {
        let idCiudad = data.ciudades[i].id;
        if (idCiudad == ciudad_envio_1) {
            latEnvio1 = data.ciudades[i].latitud;
            longEnvio1 = data.ciudades[i].longitud;
        } else if (idCiudad == ciudad_envio_2) {
            latEnvio2 = data.ciudades[i].latitud;
            longEnvio2 = data.ciudades[i].longitud;
        }
    }

    distanciaCal = calcular_distancia(latEnvio1, longEnvio1, latEnvio2, longEnvio2)
    distanciaCal = Math.round(distanciaCal)

    distanciaEnvio = distanciaCal - (distanciaCal % 100);


    let pesoEnvio = Number(document.getElementById('inp_peso_paquete').value);


    let precio_final = 50 + (10 * pesoEnvio) + (50 * ((Math.floor(distanciaEnvio)) / 100));
    document.getElementById("precio_final_envio").innerHTML = "Precio final: $" + precio_final;

    if (enviar) {

        const url = 'https://envios.develotion.com/envios.php';
        const datos = {
            "idUsuario": sessionStorage.getItem('usuarioId'),
            "idCiudadOrigen": ciudad_envio_1,
            "idCiudadDestino": ciudad_envio_2,
            "peso": pesoEnvio,
            "distancia": distanciaEnvio,
            "precio": precio_final,
            "idCategoria": idCategoriaEnvio
        }
        fetch(url, {
            method: 'POST',
            body: JSON.stringify(datos),
            headers: {
                "apikey": sessionStorage.getItem("token"),
                "Content-type": "application/json"
            }
        }).then(respuesta => (respuesta.ok) ? respuesta.json() : respuesta.text().then(text => Promise.reject(JSON.parse(text).error)))
            .then(data => router.push('/'))
            .catch(mensaje => display_toast(mensaje, 'Info', 'primary'))

    } else {
        return precio_final;
    }

}

function vista_calcular_distancia() {
    try {
        const urlCiudades = 'https://envios.develotion.com/ciudades.php';
        fetch(urlCiudades, {
            method: 'GET',
            headers: {
                "Content-type": "application/json",
                "apikey": sessionStorage.getItem("token")
            }
        }).then(respuesta => respuesta.json())
            .then(data => cargar_ciudades_cal(data))

    } catch (e) {
        display_toast(e, 'Info', 'primary');
    }
}
function cargar_ciudades_cal(data) {
    let ciudades_origen = document.getElementById("sel_ciudad_origen_cal");
    let ciudad_destino = document.getElementById("sel_ciudad_destino_cal");

    for (let i = 0; i < data.ciudades.length; i++) {
        const ciudad = data.ciudades[i];
        ciudades_origen.innerHTML += `<ion-select-option value="${ciudad.id}">${ciudad.nombre}</ion-select-option>`
        ciudad_destino.innerHTML += `<ion-select-option value="${ciudad.id}">${ciudad.nombre}</ion-select-option>`
    }
}

function calcular_distancia(lat1, lon1, lat2, lon2) {

    var R = 6378.137; //Radio de la tierra en km
    var dLat = rad(lat2 - lat1);
    var dLong = rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d.toFixed(1); //Retorna 1 decimal


}

function listar_envios() {
    let token = sessionStorage.getItem("token");
    let idUsuarioEnvio = sessionStorage.getItem("usuarioId");
    const urlListaEnvios = `https://envios.develotion.com/envios.php?idUsuario='${idUsuarioEnvio}'`;
    fetch(urlListaEnvios, {
        method: 'GET',
        headers: {
            "Content-type": "application/json",
            "apikey": `${token}`
        }
    }).then(respuesta => respuesta.json())
        .then(data => crear_listado_envios(data))
}

function crear_listado_envios(data) {
    let lista = document.getElementById('list_envios');
    lista.innerHTML = '';
    let listItemEnvios = '';
    const urlCiudades = 'https://envios.develotion.com/ciudades.php';
    fetch(urlCiudades, {
        method: 'GET',
        headers: {
            "Content-type": "application/json",
            "apikey": sessionStorage.getItem("token")
        }
    }).then(respuesta => respuesta.json())
        .then(function (listaPosiblesCiudades) {
            data.envios.forEach(unEnvio => {
                let ciudadOrigenEnvio
                let ciudadDestinoEnvio;
                for (let i = 0; i < listaPosiblesCiudades.ciudades.length; i++) {
                    const unaCiudad = listaPosiblesCiudades.ciudades[i];
                    if (unaCiudad.id == unEnvio.ciudad_origen) {
                        ciudadOrigenEnvio = unaCiudad.nombre;
                    }
                    if (unaCiudad.id == unEnvio.ciudad_destino) {
                        ciudadDestinoEnvio = unaCiudad.nombre;
                    }
                }
                listItemEnvios = `<ion-item  href="/detalleEnvio?id=${unEnvio.id}" detail>
                <ion-label>
                <h2 id="listado_envio_id">Envio #${unEnvio.id}</h2>
                <h3>De ${ciudadOrigenEnvio} a ${ciudadDestinoEnvio}</h3>     
                <h3>Distancia: ${unEnvio.distancia} km</h3>   
                <p>$${unEnvio.precio}</p>
                <ion-button onclick="eliminar_envio()" shape="round" ><ion-icon name="trash-outline"></ion-icon></ion-button>
              </ion-label>
              </ion-item>`;
                lista.innerHTML += listItemEnvios;
            });

        })
}


function info_envio() {
    const idUsuarioDetalle = sessionStorage.getItem('usuarioId');
    const idEnvioDetalle = getParam('id');
    let detalle_origen;
    let detalle_destino;

    let p_ciudad_origen = document.getElementById("detalle_origen");
    let p_ciudad_destino = document.getElementById("detalle_destino");
    let p_distancia = document.getElementById("detalle_distancia");
    let p_peso = document.getElementById("detalle_peso");
    let p_precio = document.getElementById("detalle_precio");
    const url = `https://envios.develotion.com//envios.php?idUsuario=${idUsuarioDetalle}`;
    fetch(url, {
        method: 'GET',
        headers: {
            "Content-type": "application/json",
            "apikey": sessionStorage.getItem("token")
        }
    }).then(respuesta => respuesta.json())
        .then(function (data) {
            for (let i = 0; i < data.envios.length; i++) {
                const unEnvio = data.envios[i];
                if (unEnvio.id === parseInt(idEnvioDetalle)) {

                    //invoco API de ciudades para buscar en las coordenadas de la ciudad
                    const url = `https://envios.develotion.com/ciudades.php`;
                    fetch(url, {
                        method: 'GET',
                        headers: {
                            "Content-type": "application/json",
                            "apikey": sessionStorage.getItem("token")
                        }
                    }).then(respuesta => respuesta.json())
                        .then(function (datos) {
                            let latOrigen;
                            let lonOrigen;
                            let latDestino;
                            let lonDestino;
                            for (let i = 0; i < datos.ciudades.length; i++) {
                                if (datos.ciudades[i].id == unEnvio.ciudad_origen) {
                                    detalle_origen = datos.ciudades[i].nombre;
                                    latOrigen = datos.ciudades[i].latitud;
                                    lonOrigen = datos.ciudades[i].longitud;

                                } else if (datos.ciudades[i].id == unEnvio.ciudad_destino) {
                                    detalle_destino = datos.ciudades[i].nombre;
                                    latDestino = datos.ciudades[i].latitud;
                                    lonDestino = datos.ciudades[i].longitud;
                                }
                            }
                            p_ciudad_origen.innerHTML = "Ciudad orígen: " + detalle_origen;
                            p_ciudad_destino.innerHTML = "Ciudad destino: " + detalle_destino;
                            p_distancia.innerHTML = "Distancia: " + unEnvio.distancia + " km";
                            p_peso.innerHTML = "Peso: " + unEnvio.peso + " kg";
                            p_precio.innerHTML = "Precio: $" + unEnvio.precio;
                            if (map != undefined) {
                                map.remove();
                            }
                            map = L.map('map').setView([latDestino, lonDestino], 18);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            }).addTo(map);

                            L.marker([latDestino, lonDestino]).addTo(map)
                                .bindPopup(detalle_destino)
                                .openPopup();
                            L.marker([latOrigen, lonOrigen]).addTo(map)
                                .bindPopup(detalle_origen)
                                .openPopup();


                        }
                        )

                }
            }
        });
}



function mostrar_gasto_total() {
    let token = sessionStorage.getItem("token");
    let idUsuarioEnvio = sessionStorage.getItem("usuarioId");
    const urlListaEnvios = `https://envios.develotion.com/envios.php?idUsuario='${idUsuarioEnvio}'`;
    fetch(urlListaEnvios, {
        method: 'GET',
        headers: {
            "Content-type": "application/json",
            "apikey": `${token}`
        }
    }).then(respuesta => respuesta.json())
        .then(data => calcular_gasto_total(data))
}



function calcular_gasto_total(data) {
    let gastoTotalEnvios = 0;
    for (let i = 0; i < data.envios.length; i++) {
        const unEnvio = data.envios[i];
        gastoTotalEnvios += unEnvio.precio;
    }
    gastoTotalEnvios = Math.round(gastoTotalEnvios)
    document.getElementById('gasto_total_h4').innerHTML = `El gasto total de todos sus envíos es: $${gastoTotalEnvios}`
}


function mostrar_top_departamentos() {
    let token = sessionStorage.getItem("token");
    let idUsuarioEnvio = sessionStorage.getItem("usuarioId");
    const urlListaEnvios = `https://envios.develotion.com/envios.php?idUsuario='${idUsuarioEnvio}'`;
    fetch(urlListaEnvios, {
        method: 'GET',
        headers: {
            "Content-type": "application/json",
            "apikey": `${token}`
        }
    }).then(respuesta => respuesta.json())
        .then(data => listar_top_departamentos(data))
}


function listar_top_departamentos(data) {
    let Ciudades_Contador = {
        id_Ciudad_d,
        cont
    };

    let idCiudad;
    let contador = 0;

    for (let i; i < data.envios.length; i++) {
        idCiudad = data.envios[i].ciudad_destino;

        for (let j; j < data.envios.length; j++) {
            if (idCiudad == data.envios[j].ciudad_destino) {
                contador++;
            }
        }

        Ciudades_Contador.id_Ciudad_d = data.envios[i].ciudad_destino;
        Ciudades_Contador.cont = contador;

    }

}

function eliminar_envio() {
    let envioId = document.getElementById("listado_envio_id").innerHTML;
    envioId = envioId.substring(7)
    const urlEnvios = 'https://envios.develotion.com/envios.php';
    fetch(urlEnvios, {
        method: 'DELETE',
        body: JSON.stringify({ "idEnvio": envioId }),
        headers: {
            "Content-type": "application/json",
            "apikey": sessionStorage.getItem("token")
        }
    }).then(respuesta => respuesta.json())
        .then(data => router.push('/'))

}

let router




async function obtenerDatosDispositivo() {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Device')) {
        return await Capacitor.Plugins.Device.getInfo();
    }
    else {
        throw 'Device no disponible';
    }
}

async function obtenerConexionInternet() {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Network')) {
        return await Capacitor.Plugins.Network.getStatus();
    }
    else {
        throw 'Network no disponible';
    }
}

async function obtenerAppsDispositivo() {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Share')) {
        return await Capacitor.Plugins.Device.getStatus();
    }
    else {
        throw 'Share no disponible';
    }
}
function obetener_ciudades() {
    try {
        const urlCiudades = 'https://envios.develotion.com/ciudades.php';
        fetch(urlCiudades, {
            method: 'GET',
            headers: {
                "Content-type": "application/json",
                "apikey": sessionStorage.getItem("token")
            }
        }).then(respuesta => respuesta.json())
            .then(data => calcular_ciudad_mas_cercana(data))
    } catch (e) {
        display_toast(e, 'Info', 'primary');
    }
}

function calcular_ciudad_mas_cercana(data) {
    document.getElementById('ciudad-mas_cercana_h4').innerHTML = "arriba";
    obtenerGeolocalizacion().then(coordinates => {
        const lat_dispositivo = coordinates.coords.latitude;
        const lon_dispositivo = coordinates.coords.longitude;
        document.getElementById('ciudad-mas_cercana_h4').innerHTML = "lat_dispositivo";
        let menorDistancia = Math.max();
        let ciudadMenorDistanca;
        let ciudadMenorDistancaLat;
        let ciudadMenorDistancaLong;
        let ciudadLat;
        let ciudadLong;
        for (let i = 0; i < data.ciudades.length; i++) {
            const unaCiudad = data.ciudades[i];
            ciudadLat = unaCiudad.latitud;
            ciudadLong = unaCiudad.longitud;
            const distancia = calcular_distancia(ciudadLat, ciudadLong, lat_dispositivo, lon_dispositivo)
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                ciudadMenorDistanca = unaCiudad;
                ciudadMenorDistancaLat = unaCiudad.latitud;
                ciudadMenorDistancaLong = unaCiudad.longitud;
            }
        }

        //document.getElementById('ciudad-mas_cercana_h4').innerHTML = `La ciudad más cercana es: ${ciudadMenorDistanca.nombre}`
        L.marker([ciudadMenorDistancaLat, ciudadMenorDistancaLong]).addTo()
            .bindPopup(`${ciudadMenorDistanca.nombre} <br><strong>${menorDistancia}</strong>`)
            .openPopup();
        // marker dispositivo
        L.marker([lat_dispositivo, lon_dispositivo]).addTo(map_ciudad_cercana)
    }).catch(error => display_toast(error, 'Info', 'primary'))

    obtenerDatosDispositivo().then(info => {
        alert(info.model);
    });

}


document.addEventListener('DOMContentLoaded', function () {

    let iconos_logout = document.getElementsByClassName("log_out");
    for (let i = 0; i < iconos_logout.length; i++) {
        const element = iconos_logout[i];
        element.addEventListener("click", cerrar_sesion);
    }


    obtenerConexionInternet().then((estatus) => {
        if ('none' == estatus.connectionType) {
            display_toast('Se perdi&oacute;n tu conexi&oacute;n a Internet', 'Info', 'primary');
        }
        else {
            display_toast(`Tu conexi&oacute;n a Internet es ${estatus.connectionType}`, 'Info', 'primary')
        }
    }).catch(error => display_toast('Warning', error, 'warning'));

    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Network')) {
        Capacitor.Plugins.Network.addListener('networkStatusChange', status => {
            if ('none' == status.connectionType) {
                if (Capacitor.isPluginAvailable('Haptics')) {
                    vibrar();
                }
                display_toast('Se perdi&oacute;n tu conexi&oacute;n a Internet', 'Info', 'primary');
            }
            else {
                display_toast('Se restableci&oacute; tu conexi&oacute;n a Internet', 'Info', 'primary')
            }
        });
    }



    router = document.querySelector('ion-router');
    router.addEventListener('ionRouteDidChange', function (e) {
        menuController.close();
        let nav = e.detail;
        let paginas = document.getElementsByTagName('ion-page');
        for (let i = 0; i < paginas.length; i++) {
            paginas[i].style.visibility = "hidden";
        }
        let ion_route = document.querySelectorAll(`[url="${nav.to}"]`)
        let id_pagina = ion_route[0].getAttribute('component');
        let pagina = document.getElementById(id_pagina);
        pagina.style.visibility = "visible";

        if (nav.to == "/") {
            chequear_login(router);
        }

        if (nav.to == '/calculadora') {
            vista_calcular_distancia();
        }
        if (nav.to == '/agregarEnvio') {
            agregar_envio();
        }
        if (nav.to == '/listadoEnvios') {
            listar_envios();
        }
        if (nav.to == '/detalleEnvio') {
            info_envio();
        }
        if (nav.to == '/gastoTotal') {
            mostrar_gasto_total();
        }
        if (nav.to == '/topDepartamentos') {
            mostrar_top_departamentos();
        }
        if (nav.to == '/ciudadMasCercana') {
            calcular_ciudad_mas_cercana();
        }

    })

    document.getElementById('btn_login').onclick = function () {
        const usuario = document.getElementById('inp_usuario').value;
        const password = document.getElementById('inp_contrasenia').value;
        try {
            if (!usuario) {
                throw 'Usuario requerido';
            }
            if (!password) {
                throw 'Contrase&ntilde;a requerida';
            }

            const url = 'https://envios.develotion.com/login.php';
            fetch(url, {
                method: 'POST',
                body: JSON.stringify({ usuario: usuario, password: password }),
                headers: {
                    "Content-type": "application/json"
                }
            }).then(respuesta => (respuesta.ok) ? respuesta.json() : respuesta.text().then(text => Promise.reject(JSON.parse(text).error)))
                .then(data => login(data, router))
                .catch(mensaje => display_toast(mensaje, 'Error de alta', 'primary'))

        }
        catch (e) {
            display_toast(e, 'Info', 'primary');
        }
    }

    document.getElementById('btn_registro').onclick = function () {
        try {
            const usuario = document.getElementById('inp_nombreUsuario').value;
            const password = document.getElementById('inp_password2').value;
            const repassword = document.getElementById('inp_repassword').value;

            if (!usuario) {
                throw 'Nombre requerido para continuar';
            }
            if (password != repassword) {
                throw 'Contrase&ntilde;a y repetici&oacute;n no coinciden';
            }

            const url = 'https://envios.develotion.com/usuarios.php';
            const datos = {
                "usuario": usuario,
                "password": password
            }
            fetch(url, {
                method: 'POST',
                body: JSON.stringify(datos),
                headers: {
                    "Content-type": "application/json"
                }
            }).then(respuesta => (respuesta.ok) ? respuesta.json() : respuesta.text().then(text => Promise.reject(JSON.parse(text).error)))
                .then(data => registro(data, router))
                .catch(mensaje => display_toast(mensaje, 'Info', 'primary'))
        }
        catch (e) {
            display_toast(e, 'Info', 'primary');
        }
    }

    document.getElementById("btn_agregar_envio").onclick = function () {
        try {
            let idCiudadOrigen = document.getElementById("sel_ciudad_origen").value;
            let idCiudadDestino = document.getElementById("sel_ciudad_destino").value;
            let idCategoria = document.getElementById("sel_categoria").value;
            let peso = document.getElementById("inp_peso_paquete").value;

            if (!idCiudadOrigen) {
                throw 'Ciudad de origen requerida para continuar'
            }
            if (!idCiudadDestino) {
                throw 'Ciudad de destino requerida para continuar'
            }
            if (idCiudadDestino == idCiudadOrigen) {
                throw 'Las ciudades no pueden ser iguales'
            }
            if (!idCategoria) {
                throw 'Categoría requerida para continuar'
            }
            if (!peso) {
                throw 'Peso requerido para continuar'
            }
            if (peso <= 0) {
                throw 'El peso no puede ser menor o igual a 0.'
            }
            let enviar = true;
            try {
                const urlCiudades = 'https://envios.develotion.com/ciudades.php';
                fetch(urlCiudades, {
                    method: 'GET',
                    headers: {
                        "Content-type": "application/json",
                        "apikey": sessionStorage.getItem("token")
                    }
                }).then(respuesta => respuesta.json())
                    .then(data => obtener_latitud_longitud_calcular_precio(data, peso, enviar))
            } catch (e) {
                display_toast(e, 'Info', 'primary');
            }

        }
        catch (e) {
            display_toast(e, 'Info', 'primary');
        }
    }

    document.getElementById("btn_calcular_distancia").onclick = function () {
        let ciudad_cal_1 = document.getElementById('sel_ciudad_origen_cal').value;
        let ciudad_cal_2 = document.getElementById('sel_ciudad_destino_cal').value;
        let lat1;
        let lat2;
        let long1;
        let long2;
        let detalle_ciudad_destino;
        let detalle_ciudad_origen;
        try {
            const urlCiudades = 'https://envios.develotion.com/ciudades.php';
            fetch(urlCiudades, {
                method: 'GET',
                headers: {
                    "Content-type": "application/json",
                    "apikey": sessionStorage.getItem("token")
                }
            }).then(respuesta => respuesta.json())
                .then(data => {
                    for (let i = 0; i < data.ciudades.length; i++) {
                        if (data.ciudades[i].id == ciudad_cal_1) {
                            detalle_ciudad_origen = data.ciudades[i].nombre;
                            lat1 = data.ciudades[i].latitud;
                            long1 = data.ciudades[i].longitud;
                        }
                        if (data.ciudades[i].id == ciudad_cal_2) {
                            detalle_ciudad_destino = data.ciudades[i].nombre;
                            lat2 = data.ciudades[i].latitud;
                            long2 = data.ciudades[i].longitud;
                        }
                    }
                    let distanciaCal = calcular_distancia(lat1, long1, lat2, long2)
                    distanciaCal = Math.round(distanciaCal)
                    document.getElementById('p_resultado_distancia').innerHTML = `La distancia es de ${distanciaCal}km`
                    if (map_cal != undefined) {
                        map_cal.remove();
                    }
                    map_cal = L.map('map_cal').setView([lat1, long1], 18);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map_cal);

                    L.marker([lat1, long1]).addTo(map_cal)
                        .bindPopup(detalle_ciudad_destino)
                        .openPopup();
                    L.marker([lat2, long2]).addTo(map_cal)
                        .bindPopup(detalle_ciudad_origen)
                        .openPopup();
                })


        } catch (e) {
            display_toast(e, 'Info', 'primary');
        }
    }

})



