{
  description = "A development environment for MYShare Frontend";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      # 定义一个“开发者 Shell”
      devShells.${system}.default = pkgs.mkShell {
        # 我们在这个 Shell 中需要的构建工具和依赖
        buildInputs = with pkgs; [
          # 1. 根据 @types/node 和 vite 的版本，我们选择 Node.js 20
          nodejs_20

          # 2. 根据 package.json 中的脚本，我们选择 yarn 作为包管理器
          yarn

          # 3. 为了成功编译 sharp 这个原生模块，我们需要一个完整的 C++ 工具链
          #    以及一些常见的图像库，sharp 可能会链接它们。
          #    (这是 Nix 的优势：我们可以精确声明这些系统依赖)
          gcc
          gnumake
          python3
          pkg-config

          # sharp 可能需要的额外系统库 (有备无患)
          vips
        ];

        # 当你进入这个 Shell 时，自动运行的命令
        shellHook = ''
          npm config set registry https://registry.npmmirror.com
          echo " "
          echo ">>> Welcome to the MYShare Frontend dev environment <<<"
          echo " "
          echo "    Node.js version: $(node --version)"
          echo "    Yarn version: $(yarn --version)"
          echo "    ✓ npm registry set to: $(npm config get registry)"
          echo " "
          echo "    You can now run 'yarn install' to install dependencies."
          echo " "
        '';

        DIRENV_LOG_FORMAT = "";
      };
    };
}