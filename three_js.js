const importmap = document.createElement("script");
importmap.type = "importmap";
importmap.innerHTML = `
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.173.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.173.0/examples/jsm/"
        }
    }
`

document.head.appendChild(importmap);

const modelViewer = document.querySelector("model-viewer");

const div = document.createElement("div");
div.id = "canvas-model-viewer";
div.setAttribute("slot", "canvas");

modelViewer.appendChild(div);

window.addEventListener('load', async () => {
    const THREE = await import('three');
    const GLTFLoaderModule = await import('three/addons/loaders/GLTFLoader.js');
    const GLTFLoader = GLTFLoaderModule.GLTFLoader;

    const modelViewer = document.querySelector("model-viewer");

    const div = document.createElement("div");
    div.id = "canvas-model-viewer";
    div.setAttribute("slot", "canvas");

    modelViewer.appendChild(div);

    class ThreeJSRenderer {

        constructor() {
            var container = document.querySelector("div#canvas-model-viewer");

            // this.material;

            this.camera_threejs = new THREE.PerspectiveCamera(
                modelViewer.getFieldOfView(), 
                modelViewer.clientWidth / modelViewer.clientHeight, 
                0.01, 
                10 
            );
            this.camera_threejs.position.z = 2;

            this.scene = new THREE.Scene();

            this.initScene();

            this.renderer = new THREE.WebGLRenderer( { antialias: true } );
            this.renderer.setSize( modelViewer.clientWidth, modelViewer.clientHeight );
            this.renderer.setClearColor(0xFFFFFF); // Set background color to gray
            container.appendChild( this.renderer.domElement );

            this.renderer.gammaInput = true;
            this.renderer.gammaOutput = true;

            for (let x = -1; x < 2; x+=2) {
                for (let y = -1; y < 2; y+=2) {
                    for (let z = -1; z < 2; z+=2) {
                        const light = new THREE.DirectionalLight(0xffffff, 1);
                        light.position.set(x*2,y*2,z*2).normalize();
                        this.scene.add(light);
                    }
                }    
            }
        }

        /**
         * Simula o carregamento de recursos e chama o progressCallback com o progresso.
         * Retorna uma Promise que resolve com um objeto FramingInfo.
         * @param {function} progressCallback - Função de callback para reportar o progresso.
         * @returns {Promise<FramingInfo>}
         */
        async load(progressCallback) {
            // Simula um carregamento assíncrono
            for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Simula um atraso
                progressCallback(i); // Reporta o progresso
            }

            // Retorna um objeto FramingInfo simulado
            return {
            frameWidth: 1920,
            frameHeight: 1080,
            aspectRatio: 16 / 9,
            };
        }

        /**
         * Renderiza a cena com base na câmera fornecida.
         * @param {Camera} camera - Objeto que representa a câmera.
         */
        render(camera) {
            // Cria uma instância de THREE.Matrix4 a partir da view matrix
            const matrix = new THREE.Matrix4().fromArray(camera.viewMatrix);

            // Cria objetos para armazenar posição, quaternion e escala
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();

            // Decompõe a matriz em posição, quaternion e escala
            matrix.decompose(position, quaternion, scale);

            this.camera_threejs.position['x'] = position['x']
            this.camera_threejs.position['y'] = position['y']
            this.camera_threejs.position['z'] = position['z']

            this.camera_threejs.quaternion['_x'] = quaternion['_x']
            this.camera_threejs.quaternion['_y'] = quaternion['_y']
            this.camera_threejs.quaternion['_z'] = quaternion['_z']
            this.camera_threejs.quaternion['_w'] = quaternion['_w']

            this.camera_threejs.scale['x'] = scale['x']
            this.camera_threejs.scale['y'] = scale['y']
            this.camera_threejs.scale['z'] = scale['z']

            this.camera_threejs.projectionMatrix.fromArray(camera.projectionMatrix)

            this.renderer.render( this.scene, this.camera_threejs );
        }

        /**
         * Ajusta o tamanho do renderizador.
         * @param {number} width - Nova largura.
         * @param {number} height - Nova altura.
         */
        resize(width, height) {
            this.camera_threejs.aspect = width / height;
            this.camera_threejs.updateProjectionMatrix();

            this.renderer.setSize( width, height );
        }

        initScene() {
            this.carregar_glb(modelViewer.src);
        }

        texture_from_glb(gltf, index_texture) {
            var indice_imagem = gltf.parser.json.textures[index_texture].source;

            // console.log(indice_imagem)
            
            const image = gltf.parser.json.images[indice_imagem];

            // console.log(image)
    
            // Extraia os dados binários do bufferView
            const bufferView = gltf.parser.json.bufferViews[image.bufferView];
            const buffer = gltf.parser.extensions.KHR_binary_glTF.body;

            // console.log(bufferView)
            // console.log(buffer)

            // Crie um array de bytes (Uint8Array) a partir dos dados binários
            const byteOffset = bufferView.byteOffset || 0;
            const byteLength = bufferView.byteLength;
            const imageData = new Uint8Array(buffer, byteOffset, byteLength);

            // console.log(imageData)

            // Crie um Blob a partir dos dados binários
            const blob = new Blob([imageData], { type: image.mimeType });

            // Crie uma URL temporária para o Blob
            const imageUrl = URL.createObjectURL(blob);

            // console.log(imageUrl)

            // Carregue a textura usando THREE.TextureLoader
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(imageUrl);
            texture.flipY = false;

            // console.log(texture)

            return texture;
        }

        carregar_glb(caminho_arquivo) {
            const loader = new GLTFLoader();

            var scene = this.scene;

            var function_gerar_material_parallax = this.gerar_material_parallax;

            var function_texture_from_glb = this.texture_from_glb;

            loader.load(
                caminho_arquivo, // Caminho para o arquivo GLB
                async function (gltf) {
                    const model = gltf.scene;

                    model.traverse(function(child) {
                        if(child.isMesh && child.material.userData.parallaxMapping) {
                            var parallaxConfig = child.material.userData.parallaxMapping;

                            var bumpMapTexture = function_texture_from_glb(gltf, parallaxConfig.index_texture);
                            var mapTexture = new THREE.CanvasTexture( child.material.map.source.data );

                            const material_parallax = function_gerar_material_parallax(
                                mapTexture, 
                                bumpMapTexture, 
                                parallaxConfig.scale, 
                                parallaxConfig.minLayers, 
                                parallaxConfig.maxLayers,
                            );

                            child.material = material_parallax;
                        }
                    })

                    scene.add(model);
                },
                function (xhr) {
                    // fazer nada
                },
                function (error) {
                    console.error('Erro ao carregar o modelo:', error);
                }
            );
        }

        gerar_material_parallax(texture_color, texture_height, scale, minLayers, maxLayers) {
            var parameters = {
                uniforms: THREE.UniformsUtils.clone({
                    "bumpMap": { type: "t", value: null },
                    "map": { type: "t", value: null },
                    "parallaxScale": { type: "f", value: null },
                    "parallaxMinLayers": { type: "f", value: null },
                    "parallaxMaxLayers": { type: "f", value: null }
                }),
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vViewPosition;
                    varying vec3 vNormal;
                    void main() {
                        vUv = uv;
                        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                        vViewPosition = -mvPosition.xyz;
                        vNormal = normalize( normalMatrix * normal );
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform sampler2D bumpMap;
                    uniform sampler2D map;

                    uniform float parallaxScale;
                    uniform float parallaxMinLayers;
                    uniform float parallaxMaxLayers;

                    varying vec2 vUv;
                    varying vec3 vViewPosition;
                    varying vec3 vNormal;

                    vec2 parallaxMap( in vec3 V ) {

                        // Determine number of layers from angle between V and N
                        float numLayers = mix( parallaxMaxLayers, parallaxMinLayers, abs( dot( vec3( 0.0, 0.0, 1.0 ), V ) ) );

                        float layerHeight = 1.0 / numLayers;

                        float currentLayerHeight = 1.0;
                        vec2 dtex = parallaxScale * V.xy / V.z / numLayers;
                        vec2 currentTextureCoords = vUv + dtex * numLayers;
                        float heightFromTexture = texture2D( bumpMap, currentTextureCoords ).r;
                        
                        for ( int i = 0; i == 0; i += 0 ) {
                            if ( heightFromTexture >= currentLayerHeight ) {
                                break;
                            }
                            currentLayerHeight -= layerHeight;
                            currentTextureCoords += dtex;

                            heightFromTexture = texture2D( bumpMap, currentTextureCoords ).r;
                        }
                        return currentTextureCoords;
                    }

                    vec2 perturbUv( vec3 surfPosition, vec3 surfNormal, vec3 viewPosition ) {
                        vec2 texDx = dFdx( vUv );
                        vec2 texDy = dFdy( vUv );
                        vec3 vSigmaX = dFdx( surfPosition );
                        vec3 vSigmaY = dFdy( surfPosition );
                        vec3 vR1 = cross( vSigmaY, surfNormal );
                        vec3 vR2 = cross( surfNormal, vSigmaX );
                        float fDet = dot( vSigmaX, vR1 );
                        vec2 vProjVscr = ( 1.0 / fDet ) * vec2( dot( vR1, viewPosition ), dot( vR2, viewPosition ) );
                        vec3 vProjVtex;
                        vProjVtex.xy = texDx * vProjVscr.x + texDy * vProjVscr.y;
                        vProjVtex.z = dot( surfNormal, viewPosition );
                        return parallaxMap( vProjVtex );
                    }

                    void main() {
                        // Perturba as coordenadas UV com base no mapeamento de parallax
                        vec2 mapUv = perturbUv( -vViewPosition, normalize( vNormal ), normalize( vViewPosition ) );
                        
                        // Obtém a cor da textura usando as coordenadas UV perturbadas
                        gl_FragColor = texture2D( map, mapUv );
                    }
                `
            };
            parameters.uniforms['parallaxScale'].value = -1.0 * scale;
            parameters.uniforms['parallaxMinLayers'].value = minLayers;
            parameters.uniforms['parallaxMaxLayers'].value = maxLayers;

            const material = new THREE.ShaderMaterial(parameters);
            
            material.map = texture_color;
            material.bumpMap = texture_height;

            material.map.flipY = false;
            material.bumpMap.flipY = false;

            material.map.anisotropy = 4;
            material.bumpMap.anisotropy = 4;
            parameters.uniforms['map'].value = material.map;
            parameters.uniforms['bumpMap'].value = material.bumpMap;

            material.needsUpdate = true;

            return material;
        }
    }

    var threeJSRenderer = new ThreeJSRenderer();
    modelViewer.registerRenderer(threeJSRenderer);
});