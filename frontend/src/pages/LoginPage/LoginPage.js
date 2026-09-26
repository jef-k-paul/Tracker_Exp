    import React, {Component} from "react";
    import {
        Container,
        Paper,
        Typography,
        TextField,
        Button,
        Alert
    } from "@mui/material";


    import { login } from "../../services/apiServices";


    class LoginPage extends Component {

        constructor(props) {
            super(props);

            this.state = {
                accessKey: "",
                loading: false,
                error: ""
            };
        }

        componentDidMount() {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user && (user.member_id || user.memberId)) {
                        window.location.href = "/dashboard";
                    }
                } catch (e) {
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                }
            }
        }

        handleChange = (event) => {
            this.setState({
                accessKey: event.target.value
            });
        };

        handleLogin = () => {
            this.setState({
                error: "",
                loading: true
            });

            login(this.state.accessKey)
                .then((response) => {
                    const data = response.data;
                    localStorage.setItem(
                        "user",
                        JSON.stringify(data)
                    );
                    if (data.token) {
                        localStorage.setItem("token", data.token);
                    }

                    window.location.href = "/dashboard";
                })
                .catch((error) => {
                    const errMsg = error.response?.data?.message || "Invalid Access Key";
                    this.setState({
                        error: errMsg,
                        loading: false
                    });
                });
        };

        render() {
            return (
            <Container maxWidth="sm">

                <Paper
                elevation={3}
                style={{
                    padding: "30px",
                    marginTop: "100px",
                    textAlign: "center"
                }}
                >

                <Typography
                    variant="h4"
                    gutterBottom
                >
                    Family Expense Tracker
                </Typography>


                {this.state.error && (
                <Alert severity="error">
                {this.state.error}
                </Alert>
                )}
                
                <TextField
                    fullWidth
                    label="Access Key"
                    value={this.state.accessKey}
                    onChange={this.handleChange}
                    margin="normal"
                />

            <Button
                variant="contained"
                fullWidth
                onClick={this.handleLogin}
                disabled={this.state.loading}
                style={{ marginTop: "20px" }}
            >
                {/* Login */}{this.state.loading ? "Logging In..." : "Login"}
            </Button>

            </Paper>

        </Container>
        );
    }
    }

    export default LoginPage;