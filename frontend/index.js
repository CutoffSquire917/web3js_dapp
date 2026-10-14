const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

const post_tuple = [
    { name: "id", type: "uint256" },
    { name: "content", type: "string" },
    { name: "author", type: "address" },
    { name: "timestamp", type: "uint256" },
    { name: "like", type: "uint256" },
    { name: "deleted", type: "bool" }
];

const CONTRACT_ABI = [
    { name: "create_post", type: "function", stateMutability: "nonpayable", inputs: [{ name: "content", type: "string" }], outputs: [] },
    { name: "get_posts", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "tuple[]", components: post_tuple }] },
    { name: "get_posts_by_author", type: "function", stateMutability: "view", inputs: [{ name: "author", type: "address" }], outputs: [{ name: "", type: "tuple[]", components: post_tuple }] },
    { name: "get_post", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: post_tuple }] },
    { name: "delete_post", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
    { name: "delete_my_posts", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
    { name: "toggle_like", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
    { name: "has_liked", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }, { name: "user", type: "address" }], outputs: [{ name: "", type: "bool" }] }
];

let current_account;
let web3;
let contract;
let author_filter = "";

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    const connection_btn = $('connection_btn');
    if (connection_btn) connection_btn.addEventListener('click', connectWallet);
    $('create_btn').addEventListener('click', createPost);
    $('filter_btn').addEventListener('click', applyFilter);
    $('mine_btn').addEventListener('click', () => {
        $('author_input').value = current_account;
        applyFilter();
    });
    $('all_btn').addEventListener('click', () => {
        $('author_input').value = "";
        author_filter = "";
        loadPosts();
    });
    $('delete_all_btn').addEventListener('click', deleteAllMine);
});

const connectWallet = async (e) => {
    if (!window.ethereum) {
        alert("Please install web3 provider");
        return;
    }
    try {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
            alert("Accounts not found");
            return;
        }
        current_account = accounts[0];
        e.target.hidden = true;
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        enterToDapp();
    } catch (error) {
        alert("Connect to DApp error. See logs");
        console.error("Connect error: ", error);
    }
}

const enterToDapp = () => {
    const account_lbl = $('account_lbl');
    account_lbl.hidden = false;
    account_lbl.textContent = current_account;
    $('app').hidden = false;
    loadPosts();
}

const run = async (btn, action) => {
    if (btn) btn.disabled = true;
    try {
        await action();
    } catch (error) {
        alert("Transaction error. See logs");
        console.error(error);
    } finally {
        if (btn) btn.disabled = false;
    }
}

const createPost = () => run($('create_btn'), async () => {
    const input = $('post_input');
    const content = input.value.trim();
    if (!content) {
        alert("Post is empty");
        return;
    }
    await contract.methods.create_post(content).send({ from: current_account });
    input.value = "";
    await loadPosts();
});

const applyFilter = () => {
    const value = $('author_input').value.trim();
    if (value && !web3.utils.isAddress(value)) {
        alert("Invalid address");
        return;
    }
    author_filter = value;
    loadPosts();
}

const deleteAllMine = () => run($('delete_all_btn'), async () => {
    if (!confirm("Delete all your posts?")) return;
    await contract.methods.delete_my_posts().send({ from: current_account });
    await loadPosts();
});

const loadPosts = async () => {
    const box = $('posts');
    try {
        const posts = author_filter
            ? await contract.methods.get_posts_by_author(author_filter).call()
            : await contract.methods.get_posts().call();
        const likes = await Promise.all(
            posts.map((p) => contract.methods.has_liked(p.id, current_account).call())
        );
        box.replaceChildren();
        if (posts.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'card empty';
            empty.textContent = 'No posts';
            box.append(empty);
            return;
        }
        [...posts].reverse().forEach((p) => {
            const index = posts.indexOf(p);
            box.append(renderPost(p, likes[index]));
        });
    } catch (error) {
        console.error("Load posts error: ", error);
        alert("Load posts error. See logs");
    }
}

const renderPost = (post, liked) => {
    const card = document.createElement('article');
    card.className = 'card';

    const meta = document.createElement('div');
    meta.className = 'post-meta';
    const author = document.createElement('span');
    author.className = 'post-author';
    author.textContent = post.author;
    author.title = 'Show posts of this author';
    author.addEventListener('click', () => {
        $('author_input').value = post.author;
        applyFilter();
    });
    const time = document.createElement('span');
    time.textContent = new Date(Number(post.timestamp) * 1000).toLocaleString();
    meta.append(author, time);

    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = post.content;

    const actions = document.createElement('div');
    actions.className = 'post-actions';

    const like_btn = document.createElement('button');
    like_btn.className = 'like-btn' + (liked ? ' active' : '');
    like_btn.textContent = `♥ ${post.like}`;
    like_btn.addEventListener('click', () => run(like_btn, async () => {
        await contract.methods.toggle_like(post.id).send({ from: current_account });
        await loadPosts();
    }));
    actions.append(like_btn);

    if (post.author.toLowerCase() === current_account.toLowerCase()) {
        const del_btn = document.createElement('button');
        del_btn.className = 'danger';
        del_btn.textContent = 'Delete';
        del_btn.addEventListener('click', () => run(del_btn, async () => {
            await contract.methods.delete_post(post.id).send({ from: current_account });
            await loadPosts();
        }));
        actions.append(del_btn);
    }

    card.append(meta, content, actions);
    return card;
}
