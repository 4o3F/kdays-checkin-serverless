const axios = require('axios');

exports.main_handler = async (event, context) => {
    for (let i = 0; i < 5; i++) {
        console.log(`Attempt ${i + 1}`);
        try {
            const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';
            const username = process.env.USERNAME;
            const password = process.env.PASSWORD;
            if (!username || !password) {
                throw new Error('Please set USERNAME and PASSWORD environment variables.');
            }

            const initialResponse = await axios.get(
                'https://u.schale.moe/sso/login/?client_id=kd.bbs&redirect_uri=https://bbs2.kdays.net/&state=login',
                {
                    headers: {
                        'User-Agent': UA,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                    }
                }
            );

            let cookies = initialResponse.headers['set-cookie'];
            const akariCookie = cookies.find(c => c.startsWith('_akari='));
            const akariValue = akariCookie.split(';')[0].split('=')[1];
            console.log(`_akari=${akariValue}`);

            const loginParams = new URLSearchParams();
            loginParams.append('_akari', akariValue);
            loginParams.append('lgt', 'input');
            loginParams.append('app_id', '9');
            loginParams.append('redirect_uri', 'https://b.schale.moe/');
            loginParams.append('state', 'login');
            loginParams.append('input', username);
            loginParams.append('password', password);

            const loginResponse = await axios.post(
                'https://u.schale.moe/sso/login/authorize',
                loginParams.toString(),
                {
                    maxRedirects: 0,
                    headers: {
                        'Cookie': `_akari=${akariValue}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Referer': 'https://u.schale.moe/sso/login/?client_id=kd.bbs&redirect_uri=https%3A%2F%2Fbbs2.kdays.net%2F&state=login',
                        'User-Agent': UA,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    }
                }
            ).catch(err => err.response);

            let location = loginResponse.headers.location;
            location = location.replace('https://bbs2.kdays.net/', 'https://u.schale.moe/');
            let finalResponse;
            let kokoroValue;

            for (let i = 0; i < 2; i++) {
                console.log(`Redirecting to ${location} for the ${i + 1} time`);
                finalResponse = await axios.get(location, {
                    headers: {
                        'Cookie': `_akari=${akariValue}`,
                        'User-Agent': UA,
                    },
                    maxRedirects: 0,
                    validateStatus: function (status) {
                        return status >= 200 && status <= 302
                    }
                }).catch(err => err);

                if ([301, 302, 307, 308].includes(finalResponse.status)) {
                    console.log(`Redirecting to: ${finalResponse.headers.location}`);
                    location = finalResponse.headers.location;
                } else if (finalResponse.status === 200) {
                    cookies = finalResponse.headers['set-cookie']
                    const akariCookie = cookies.find(c => c.startsWith('kokoro='));
                    kokoroValue = akariCookie.split(';')[0].split('=')[1];
                    break;
                } else {
                    throw new Error(`Unexpected status code: ${finalResponse.status}`);
                }
            }

            console.log("Login successful")

            const checkParams = new URLSearchParams();
            checkParams.append('_akari', akariValue);

            const signInResponse = await axios.post(
                'https://b.schale.moe/h/task?action=signIn',
                checkParams.toString(),
                {
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': `_akari=${akariValue};kokoro=${kokoroValue}`,
                        'User-Agent': UA,
                    }
                }
            );

            if (signInResponse.status !== 200) {
                throw new Error(`Unexpected status code: ${signInResponse.status}`);
            }

            console.log("Daily checkin successful")

            const checkResponse = await axios.post(
                'https://b.schale.moe/h/task?action=check',
                checkParams.toString(),
                {
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': `_akari=${akariValue};kokoro=${kokoroValue}`,
                        'User-Agent': UA,
                    }
                }
            );

            if (checkResponse.status !== 200) {
                throw new Error(`Unexpected status code: ${checkResponse.status}`);
            }

            console.log("Weekly checkin successful")
            return;
        } catch (error) {
            console.error('An error occurred', error);
        }
    }
};