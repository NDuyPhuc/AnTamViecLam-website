
import { ethers } from 'ethers';

// --- CẤU HÌNH DEMO ---
// Đây là địa chỉ ví đại diện cho "Smart Contract Quỹ An Sinh" hoặc "Ví Hưu Trí".
// ĐỂ DEMO ẤN TƯỢNG: Hãy thay địa chỉ này bằng một địa chỉ ví phụ (Account 2) của bạn.
// Khi demo, bạn chuyển tiền từ Account 1, sau đó mở Account 2 cho giám khảo xem tiền đã về.
export const WELFARE_FUND_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; 

// Cấu hình mạng Polygon Amoy
const AMOY_CHAIN_ID_HEX = "0x13882"; // 80002 in hex
const AMOY_NETWORK_PARAMS = {
    chainId: AMOY_CHAIN_ID_HEX,
    chainName: "Polygon Amoy Testnet",
    nativeCurrency: {
        name: "POL",
        symbol: "POL",
        decimals: 18,
    },
    rpcUrls: ["https://rpc-amoy.polygon.technology/"],
    blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};

export interface WalletState {
    address: string | null;
    balance: string | null;
    chainId: string | null;
    isConnected: boolean;
}

export const connectWallet = async (): Promise<WalletState> => {
    // Kiểm tra xem trình duyệt có ví Web3 không
    if (!(window as any).ethereum) {
        throw new Error("Vui lòng cài đặt MetaMask để sử dụng tính năng này!");
    }

    try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        
        // 1. Yêu cầu người dùng kết nối ví
        await provider.send("eth_requestAccounts", []);
        
        // 2. Tự động kiểm tra và chuyển mạng sang Polygon Amoy
        try {
            await provider.send("wallet_switchEthereumChain", [{ chainId: AMOY_CHAIN_ID_HEX }]);
        } catch (switchError: any) {
            // Mã lỗi 4902 nghĩa là mạng chưa được thêm vào ví
            if (switchError.code === 4902) {
                try {
                    await provider.send("wallet_addEthereumChain", [AMOY_NETWORK_PARAMS]);
                } catch (addError) {
                    console.error("User rejected adding network:", addError);
                    throw new Error("Bạn cần thêm mạng Polygon Amoy để sử dụng tính năng này.");
                }
            } else {
                console.error("Failed to switch network:", switchError);
                throw switchError;
            }
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        // Lấy số dư
        const balanceBigInt = await provider.getBalance(address);
        const balance = ethers.formatEther(balanceBigInt);
        
        const network = await provider.getNetwork();

        console.log("🔗 [Blockchain] Connected:", address);
        console.log("💰 [Blockchain] Balance:", balance, "POL");

        return {
            address,
            balance,
            chainId: network.chainId.toString(),
            isConnected: true
        };
    } catch (error) {
        console.error("❌ Connect wallet error:", error);
        throw error;
    }
};

export const getWalletBalance = async (address: string): Promise<string> => {
    if (!(window as any).ethereum) return "0";
    try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const balanceBigInt = await provider.getBalance(address);
        return ethers.formatEther(balanceBigInt);
    } catch (e) {
        console.error("Error fetching balance:", e);
        return "0";
    }
};

/**
 * Gửi tiền (POL/MATIC)
 * @param amountInEther Số lượng tiền muốn gửi
 * @param recipientAddress Địa chỉ người nhận. Nếu không có, mặc định gửi vào Quỹ An Sinh.
 */
export const sendPayment = async (amountInEther: string, recipientAddress?: string): Promise<string> => {
    if (!(window as any).ethereum) throw new Error("No crypto wallet found");

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    
    const targetAddress = recipientAddress || WELFARE_FUND_ADDRESS;

    console.log(`💸 [Blockchain] Initiating transaction: Sending ${amountInEther} POL to ${targetAddress}`);

    // Tạo giao dịch gửi Native Token (MATIC/POL)
    const tx = await signer.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther(amountInEther)
    });

    console.log("⏳ [Blockchain] Transaction sent, waiting for confirmation...", tx.hash);

    // Chờ giao dịch được confirm trên Blockchain (đào block)
    await tx.wait(); 

    console.log("✅ [Blockchain] Transaction confirmed:", tx.hash);
    return tx.hash;
};

export const formatAddress = (addr: string): string => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};
