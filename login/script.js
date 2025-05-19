function showOrHide() {//パスワードを表示するか隠すかを判断するプログラム
    let showpass = document.getElementById("pass");
    let check = document.getElementById("showpassword");
    if (check.checked) {
        showpass.type = "text";
    } else {
        showpass.type = "password";
    }
}

let userdata = [//必要に応じてここにログイン情報を追加する。例:{name: "user4",age: 24, email: "user4@exam@;e.com" password: "user-4"}
    { name: "administrator", age: 20, email: "Administrator@example.com", password: "Administrator" },
    { name: "user1", age: 21, email: "user1@example.com", password: "user-1" },
    { name: "user2", age: 22, email: "user2@example.com", password: "user-2" },
    { name: "user3", age: 23, email: "user3@example.com", password: "user-3" }
];

function login() {
    let loginuser = ""
    let username = document.getElementById("username").value;
    let password = document.getElementById("pass").value;

    let found = false;
    let i = 0;

    while (!found && i < userdata.length) {//foundがtrueを返すかuserdataのlengthがiより少なくなるまで以下の処理を実行
        loginuser = userdata[i];
        if (loginuser.hasOwnProperty("name") && loginuser.hasOwnProperty("password")) {//データが破損していないかの確認（参考:chatgpt）
            if (loginuser.name === username && loginuser.password === password) {
                found = true;
            }
        }
        i++;
    }

    if (found) {/*foundがtrueの場合にcontainer2の要素(<p>)を上書きする。*/
        alert(`こんにちは。${username}さん。`);
        console.log(`logined is ${username}`);
        document.getElementById("user").textContent = "ユーザー名:" + loginuser.name;
        document.getElementById("age").textContent = "年齢:" + loginuser.age;
        document.getElementById("email").textContent = "Eメール:" + loginuser.email;
        document.getElementById("password2").textContent = "パスワード:" + loginuser.password;
    } else {
        alert("ログインに失敗しました。入力している内容がデータと一致しませんでした。間違いがない場合は、ユーザーデータが破損している可能性があります。入力内容に誤りのない場合は、javascriptファイルのuserdata変数を確認してください。\nEnglish...Login failed. Data in the user data variable may be corrupted or entered incorrectly. If there are no typos in what you entered, please check the userdata variable in javascript.");
        console.log("Login failed. Data in the user data variable may be corrupted or entered incorrectly. If there are no typos in what you entered, please check the userdata variable in javascript.");

    }
}

