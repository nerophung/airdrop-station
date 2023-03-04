import {
    Transaction,
    PublicKey as PublicKeyConstructor,
    Connection,
    Keypair,
    sendAndConfirmTransaction,
    clusterApiUrl
} from "@solana/web3.js";
import {
    createCreateMetadataAccountV2Instruction
} from "@metaplex-foundation/mpl-token-metadata";
import { Buffer } from "buffer";
import { createMint, createAccount, createFreezeAccountInstruction, mintTo } from "@solana/spl-token";
import bs58 from 'bs58'


// Use a read URL for your connection, and a real user.
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

const privateKey = '3J4EiyA4LdXwcXk4nyBZvEwTbSGuL9tcj9DTpPtGZTKJwHRe3wihokpJDb53yST7aYDTyttPJu7TBdoj228yocm'
const wallet = Keypair.fromSecretKey(new Uint8Array(bs58.decode(privateKey)))

const METAPLEX_TOKEN_METADATA_PROGRAM_ADDRESS =
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

const metaplexTokenMetadataProgram = new PublicKeyConstructor(
    METAPLEX_TOKEN_METADATA_PROGRAM_ADDRESS
);

const createMetadataAccount = async (
    metadataPDA,
    mint,
    payer,
    metadataData
) => {
    const transaction = new Transaction().add(
        createCreateMetadataAccountV2Instruction(
            {
                metadata: metadataPDA,
                mint: mint,
                mintAuthority: payer,
                payer: payer,
                updateAuthority: payer,
            },
            {
                createMetadataAccountArgsV2: {
                    data: metadataData,
                    isMutable: true,
                },
            }
        )
    );
    return transaction;
};

const getMetadataPDA = (mint) => {
    return PublicKeyConstructor.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            metaplexTokenMetadataProgram.toBuffer(),
            mint.toBuffer(),
        ],
        metaplexTokenMetadataProgram
    )[0];
};

// Doesn't have to be DataV2, if you're not making art NFTs
const metadata = {
    name: "KYC Soulbound Token",
    symbol: "KST",
    uri: "https://gateway.pinata.cloud/ipfs/QmSBFL6NFL7jxARBvjvvdfrTAqp8DLxQX16Sv8oekrp4Cs/", // Arweave URI link which uses metaplex standard if you're making art NFTs
    sellerFeeBasisPoints: 0,
    creators: [{
        address: wallet.publicKey,
        share: 100
    }],
    collection: null,
    uses: null,
};

const addMetadata = async (mintAddress, connection) => {
    const metadataAccount = await getMetadataPDA(mintAddress);
    const transactionToSend = await createMetadataAccount(
        metadataAccount,
        mintAddress,
        wallet.publicKey,
        metadata
    );
    const transactionId = await sendAndConfirmTransaction(
        connection,
        transactionToSend,
        [wallet]
    );
    return transactionId;
};

const mintNFT = async (receiver) => {
    // Create a SPL token first with supply = 1 and decimal = 0 so the wallets can identify your asset (done, easy!)
    const mintAddress = await createMint(
        connection,
        wallet,
        wallet.publicKey,
        wallet.publicKey,
        0
    );
    // Create another account preferably derived from the mint address of your SPL token using PDAs
    // Finally, save your custom metadata in the second account and use it in any way you need.
    await addMetadata(mintAddress, connection);

    const toTokenAccount = await createAccount(
        connection,
        wallet,
        mintAddress,
        new PublicKeyConstructor(receiver)
    );

    await metaplex.nfts().verifyCreator({ mintAddress: list[3].mintAddress, wallet });

    const tx1 = await mintTo(
        connection,
        wallet,
        mintAddress,
        toTokenAccount,
        wallet,
        1,
        [],
    );

    

    let transaction2 = new Transaction()
        .add(createFreezeAccountInstruction(
            toTokenAccount,
            mintAddress,
            wallet.publicKey,
        ));
    await sendAndConfirmTransaction(connection, transaction2, [wallet]);

    console.log('MINT TX: ', tx1)

};

const receiver = 'oWF35rvjqs8sNq4cMBkSRwjCGLHamzZxyBWPuJunnZP'
mintNFT(receiver)
