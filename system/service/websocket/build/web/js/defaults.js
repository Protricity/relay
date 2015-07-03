var defaultSocketList = [
    'ws://localhost:8080/websocket/socket'
];

var socketListByPath = {};
//socketListByPath['/private/channel/'] = ['ws://domain:port/path/to/socket'];

var socketListPublic = null;
// socketListPublic = ['ws://domain:port/path/to/socket'];

var socketListPrivate = null;
// socketListPublic = ['ws://domain:port/path/to/socket'];

var publicKey = "-----BEGIN PGP PUBLIC KEY BLOCK-----\n"
                +"Version: BCPG C# v1.6.1.0\n"
                +"\n"
                +"mQENBFWWB7kBCACKbTfayDsj17xwVrBKzLGbzxwDQuQp+VRWrC0EV5lup4F1N3mC\n"
                +"RdL9qF8c3s7uqsz1XzYJcJQyOGJA3/w3DvUuROd0Lk13tgy0NgcHechl2Ys1jkbY\n"
                +"b2cj2na50XSGVbN9FXHUy2TjRa1jnC1yVIzSWlCsyj5lzRNarEwI9j8JZNdPuVU3\n"
                +"IoyggUq8wJLLKQbc/seP3LVslhnGj5yWu9oVclo4m/iAEyIRHF6qM3OIHh47Dpzy\n"
                +"kmM3K/hIaQ8v9rygtfc1+AtmpYnvnplz7p3Sw9e5ePwiaIdhbZgGkGd83nBpCLsP\n"
                +"3GHlXE8k2zKu9Dnb64URCMXw8egjOyFv8q69ABEBAAG0DHd1dEBvaG9rLmNvbYkB\n"
                +"HAQQAQIABgUCVZYHuQAKCRDTQI7+70jUw6UuB/47+BuQqPQjhGjqqO+Ey5hFAxgh\n"
                +"aZeR6O0nRvkgyt5tHYfqtI4GvknvTcjZb31a63KwstgRhUq0PShl2oZc5TdRLkXv\n"
                +"JJA+SaO4soQySVg5FYztIqiomTZbVRVxUmH5TU1Zrc0y/1BFmYzQAZzl0Uv5Ffhg\n"
                +"1tc6iqqgaYtlQy56MHdaOZojxzAxIhdWy90T3notLAvYYs7BtkDel99TZQnsquaY\n"
                +"+RVlwDwFXW12rp1zQhTMofF008MgmzBQeIs4H3CTY1ZU6hu+3I5D029TVyinbXyc\n"
                +"Sn2t0Cuucrv1mkT5+RB0l0tTc7aDOGI22vgupWA3K4bFSVeVnjw1GRDwKZAq\n"
                +"=TnP7\n"
                +"-----END PGP PUBLIC KEY BLOCK-----\n";
