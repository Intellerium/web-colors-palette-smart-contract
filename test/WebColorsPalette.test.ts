import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const BASE_METADATA_URI = "http:\\\\localhost:3000\\";

const WHITE = 0xffffff;
const BLACK = 0x000000;
const RED = 0xff0000;
const GREEN = 0x00ff00;
const BLUE = 0x0000ff;

const NOT_MINTED = 0xabcdef;

describe("WebColorsPalette", function () {
  async function deployWebColorsPaletteFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2] = await ethers.getSigners();

    const ProxyRegistry = await ethers.getContractFactory("ProxyRegistry");
    const proxy = await ProxyRegistry.deploy();

    const WebColorsPalette = await ethers.getContractFactory(
      "WebColorsPalette"
    );
    const wcp = await WebColorsPalette.deploy(proxy.address);

    return { wcp, owner, account1, account2 };
  }

  describe("Deployment", function () {
    it("Should returns balance 7 for owner and 0 for other", async function () {
      const { wcp, owner, account1, account2 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      console.warn("NODE", process.env);

      expect(await wcp.balanceOf(owner.address)).to.equal(7);
      expect(await wcp.balanceOf(account1.address)).to.equal(0);
      expect(await wcp.balanceOf(account2.address)).to.equal(0);
    });

    it("Should set the right owner", async function () {
      const { wcp, owner } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.owner()).to.equal(owner.address);
    });

    it("Should returns correct version of palette", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.version()).to.equal(1);
    });

    it("Should returns correct name", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.name()).to.equal("Web Colors Palette");
    });

    it("Should returns correct symbol", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.symbol()).to.equal("WCP");
    });
  });

  describe("Metadata URI", function () {
    it("Should return URL with token id", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.tokenURI(WHITE)).to.equal(
        BASE_METADATA_URI + WHITE.toString()
      );
      expect(await wcp.tokenURI(BLUE)).to.equal(
        BASE_METADATA_URI + (255).toString()
      );
      expect(await wcp.tokenURI(BLACK)).to.equal(
        BASE_METADATA_URI + (0).toString()
      );
    });

    it("Should fail for not minted token", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      await expect(wcp.tokenURI(NOT_MINTED)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
    });

    it("Should return URL to palette metadata", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.contractURI()).to.equal(
        BASE_METADATA_URI + "webcolorspalette"
      );
    });
  });

  describe("Transfers", function () {
    it("Should transfer to first account", async function () {
      const { wcp, owner, account1 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      expect(await wcp.ownerOf(WHITE)).to.eq(owner.address);

      await expect(wcp.transferFrom(owner.address, account1.address, WHITE)).not
        .to.reverted;
      expect(await wcp.ownerOf(WHITE)).to.eq(account1.address);
    });

    it("Should revert when transfer from incorrect account", async function () {
      const { wcp, owner, account1 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      expect(await wcp.ownerOf(WHITE)).to.eq(owner.address);
      await expect(
        wcp
          .connect(account1)
          .transferFrom(owner.address, account1.address, WHITE)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");
      expect(await wcp.ownerOf(WHITE)).to.eq(owner.address);
    });

    it("Should transfer after correct transfer", async function () {
      const { wcp, owner, account1, account2 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      expect(await wcp.ownerOf(WHITE)).to.eq(owner.address);
      await expect(wcp.transferFrom(owner.address, account1.address, WHITE)).not
        .to.be.reverted;
      expect(await wcp.ownerOf(WHITE)).to.eq(account1.address);

      await expect(
        wcp.transferFrom(owner.address, account1.address, WHITE)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");

      await expect(
        wcp
          .connect(account1)
          .transferFrom(account1.address, account2.address, WHITE)
      ).not.to.be.reverted;

      expect(await wcp.ownerOf(WHITE)).to.eq(account2.address);
      await expect(
        wcp
          .connect(account1)
          .transferFrom(account2.address, account1.address, WHITE)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");
    });
  });

  describe("Positions", function () {
    describe("Default positon", function () {
      it("Should return first position", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        const { x, y } = await wcp.positionOf(WHITE);
        expect(x).to.eq(0);
        expect(y).to.eq(0);
      });

      it("Should return second position", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        const { x, y } = await wcp.positionOf(BLACK);
        expect(x).to.eq(0);
        expect(y).to.eq(1);
      });
    });

    describe("Swapping for free", function () {
      it("Should not revert bouth items owned", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);
        await expect(wcp.swap(WHITE, BLACK)).not.to.be.reverted;
      });

      it("Should swap positions by owner of first item", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        await wcp.swap(WHITE, BLACK);

        const { x: fx, y: fy } = await wcp.positionOf(WHITE);
        expect(fx).to.eq(0);
        expect(fy).to.eq(1);
      });

      it("Should emint change positions event", async function () {
        const { wcp, owner } = await loadFixture(deployWebColorsPaletteFixture);

        await expect(wcp.swap(WHITE, BLACK))
          .to.emit(wcp, "Swapped")
          .withArgs(owner.address, WHITE, BLACK);
      });

      it("Should chage version after swap positions", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        expect(await wcp.version()).to.eq(1);

        await wcp.swap(WHITE, BLACK);

        expect(await wcp.version()).to.eq(2);
      });

      it("Should swop positions by owner of second item", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        await wcp.swap(WHITE, BLACK);

        const { x: fx, y: fy } = await wcp.positionOf(BLACK);
        expect(fx).to.eq(0);
        expect(fy).to.eq(0);
      });

      it("Should not swap positions by owner of second item", async function () {
        const { wcp, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.connect(account1).swap(WHITE, BLACK)).to.be.reverted;
      });

      it("Should change possition after transfer", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, WHITE);
        await wcp.transferFrom(owner.address, account1.address, BLACK);

        await expect(wcp.connect(account1).swap(WHITE, BLACK)).not.to.be
          .reverted;
      });

      it("Should not change possition after transfer from old account", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, WHITE);
        await wcp.transferFrom(owner.address, account1.address, BLACK);

        await expect(wcp.swap(WHITE, BLACK)).to.be.reverted;
      });
    });

    describe("Approve charge possition", function () {
      it("Should approve", async function () {
        const { wcp, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.approveSwap(account1.address, WHITE)).not.to.be
          .reverted;
        expect(await wcp.getSwapApproved(WHITE)).to.eq(account1.address);
      });

      it("Should emit approve event", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.approveSwap(account1.address, WHITE))
          .to.emit(wcp, "SwapApproval")
          .withArgs(owner.address, account1.address, WHITE);
      });

      it("Should not approve", async function () {
        const { wcp, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.connect(account1).approveSwap(account1.address, WHITE))
          .to.be.reverted;
      });

      it("Should not approve to another account", async function () {
        const { wcp, account1, account2 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.connect(account1).approveSwap(account2.address, WHITE))
          .to.be.reverted;
      });

      it("Should change position after approve", async function () {
        const { wcp, owner, account1, account2 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        const { x: x1, y: y1 } = await wcp.positionOf(BLACK);
        expect(x1).to.eq(0);
        expect(y1).to.eq(1);

        const { x: x2, y: y2 } = await wcp.positionOf(WHITE);
        expect(x2).to.eq(0);
        expect(y2).to.eq(0);

        await wcp.transferFrom(owner.address, account1.address, WHITE);
        await wcp.transferFrom(owner.address, account2.address, BLACK);

        await wcp.connect(account1).approveSwap(account2.address, WHITE);

        await expect(wcp.swap(BLACK, WHITE)).to.be.reverted;
        await expect(wcp.swap(WHITE, BLACK)).to.be.reverted;
        await expect(wcp.connect(account1).swap(BLACK, WHITE)).to.be.reverted;

        await wcp.connect(account2).swap(BLACK, WHITE);

        const { x: x3, y: y3 } = await wcp.positionOf(BLACK);
        expect(x3).to.eq(0);
        expect(y3).to.eq(0);

        const { x: x4, y: y4 } = await wcp.positionOf(WHITE);
        expect(x4).to.eq(0);
        expect(y4).to.eq(1);
      });
    });

    describe("Price for swap", function () {
      it("Should apply New price", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        expect(await wcp.getSwapPrice(WHITE)).to.eq(0);

        await expect(wcp.setSwapPrice(WHITE, ethers.utils.parseEther("0.1")))
          .not.to.be.reverted;

        expect(await wcp.getSwapPrice(WHITE)).to.eq(
          ethers.utils.parseEther("0.1")
        );
      });

      it("Should apply New price after transfer", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, WHITE);

        expect(await wcp.getSwapPrice(WHITE)).to.eq(0);

        await expect(
          wcp
            .connect(account1)
            .setSwapPrice(WHITE, ethers.utils.parseEther("0.01"))
        ).not.to.be.reverted;

        expect(await wcp.getSwapPrice(WHITE)).to.eq(
          ethers.utils.parseEther("0.01")
        );
      });

      it("Should not set price by not owner", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, WHITE);

        await expect(wcp.setSwapPrice(WHITE, ethers.utils.parseEther("0.01")))
          .to.be.reverted;

        expect(await wcp.getSwapPrice(WHITE)).to.eq(0);
      });

      it("Should set price to 0", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        await wcp.setSwapPrice(WHITE, ethers.utils.parseEther("0.005"));
        expect(await wcp.getSwapPrice(WHITE)).to.eq(
          ethers.utils.parseEther("0.005")
        );

        await wcp.setSwapPrice(WHITE, 0);
        expect(await wcp.getSwapPrice(WHITE)).to.eq(0);
      });

      it("Should emit event when price updated", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        const amout = ethers.utils.parseEther("5");
        await expect(wcp.setSwapPrice(WHITE, amout))
          .to.emit(wcp, "SwapPriceUpdated")
          .withArgs(WHITE, amout);
      });
    });

    describe("Swapping for money", function () {
      it("Should not revert bouth items owned even price is not 0", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        const amout = ethers.utils.parseEther("0.015");
        await wcp.setSwapPrice(BLACK, amout);
        await expect(wcp.swap(WHITE, BLACK)).not.to.be.reverted;

        expect(await ethers.provider.getBalance(wcp.address)).to.eq(0);
      });

      it("Should revert bouth items owned and pay, price is 0", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        const amout = ethers.utils.parseEther("0.0155");
        await wcp.setSwapPrice(BLACK, amout);

        await expect(
          wcp.swap(WHITE, BLACK, { value: amout })
        ).to.be.revertedWith("Owner of both tokens should not pay to swap");

        expect(await ethers.provider.getBalance(wcp.address)).to.eq(0);
      });

      it("Should revert swap without maney", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, BLACK);

        const amout = ethers.utils.parseEther("0.0133");
        await wcp.connect(account1).setSwapPrice(BLACK, amout);

        await expect(wcp.swap(WHITE, BLACK)).to.be.revertedWith(
          "Transaction value did not equal the swap price"
        );

        expect(await ethers.provider.getBalance(wcp.address)).to.eq(0);
      });

      it("Should revert swap if too much maney", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, BLACK);

        await wcp
          .connect(account1)
          .setSwapPrice(BLACK, ethers.utils.parseEther("0.0133"));

        await expect(
          wcp.swap(WHITE, BLACK, { value: ethers.utils.parseEther("0.02") })
        ).to.be.revertedWith("Transaction value did not equal the swap price");

        expect(await ethers.provider.getBalance(wcp.address)).to.eq(0);
      });

      it("Should revert swap if maney not enough", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, BLACK);

        await wcp
          .connect(account1)
          .setSwapPrice(BLACK, ethers.utils.parseEther("0.0133"));

        expect(await ethers.provider.getBalance(wcp.address)).to.eq(0);

        await expect(
          wcp.swap(WHITE, BLACK, { value: ethers.utils.parseEther("0.01") })
        ).to.be.revertedWith("Transaction value did not equal the swap price");

        expect(await ethers.provider.getBalance(wcp.address)).to.eq(0);
      });

      it("Should swap with maney", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, BLACK);

        const amout = ethers.utils.parseEther("0.0133");
        await wcp.connect(account1).setSwapPrice(BLACK, amout);

        expect(await wcp.payments(account1.address)).to.eq(0);

        await wcp.swap(WHITE, BLACK, { value: amout });

        var fee = amout.div(100).mul(await wcp.SWAP_FEE());
        expect(await wcp.payments(account1.address)).to.eq(amout.sub(fee));
        expect(await wcp.payments(owner.address)).to.eq(fee);

        expect(await ethers.provider.getBalance(wcp.address)).to.eq(0);
      });

      it("Should withdraw maney after swap", async function () {
        const { wcp, owner, account1, account2 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        expect(await wcp.payments(account1.address)).to.eq(0);
        expect(await wcp.payments(account2.address)).to.eq(0);
        expect(await wcp.payments(owner.address)).to.eq(0);

        await wcp.transferFrom(owner.address, account1.address, BLACK);
        await wcp.transferFrom(owner.address, account2.address, WHITE);

        const swapAmount = ethers.utils.parseEther("0.0333");
        await wcp.connect(account1).setSwapPrice(BLACK, swapAmount);

        await wcp.connect(account2).swap(WHITE, BLACK, { value: swapAmount });

        expect(await wcp.payments(account2.address)).to.eq(0);

        const fee = swapAmount.div(100).mul(await wcp.SWAP_FEE());
        const payeeAmount = swapAmount.sub(fee);

        await expect(
          wcp.withdrawPayments(account1.address)
        ).to.changeEtherBalance(account1, payeeAmount);

        await expect(
          wcp.connect(account1).withdrawPayments(owner.address)
        ).to.changeEtherBalance(owner, fee);
      });
    });
  });
});
