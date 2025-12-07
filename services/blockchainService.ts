
import { ethers } from 'ethers';

// Địa chỉ ví của "Quỹ An Sinh" (Đây có thể là ví của bạn dùng để nhận tiền testnet)
const WELFARE_FUND_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Ví dụ dummy, hãy thay bằng ví testnet của bạn

export interface WalletState {
    address: string | null;
    balance: string | null;
    chainId: string | null;
    isConnected: boolean;
}

export const connectWallet = async (): Promise<WalletState> => {
    if (!(window as any).ethereum) {
        throw new Error("Vui lòng cài đặt MetaMask để sử dụng tính năng này!");
    }

    try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balanceBigInt = await provider.getBalance(address);
        const balance = ethers.formatEther(balanceBigInt);
        const network = await provider.getNetwork();

        return {
            address,
            balance,
            chainId: network.chainId.toString(),
            isConnected: true
        };
    } catch (error) {
        console.error("Connect wallet error:", error);
        throw error;
    }
};

export const sendDonation = async (amountInEther: string): Promise<string> => {
    if (!(window as any).ethereum) throw new Error("No crypto wallet found");

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    // Tạo giao dịch gửi Native Token (MATIC/POL/ETH)
    const tx = await signer.sendTransaction({
        to: WELFARE_FUND_ADDRESS,
        value: ethers.parseEther(amountInEther)
    });

    // Chờ giao dịch được confirm (đào)
    // await tx.wait(); // Có thể chờ hoặc trả về hash ngay để UI xử lý

    return tx.hash;
};

export const formatAddress = (addr: string): string => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};
