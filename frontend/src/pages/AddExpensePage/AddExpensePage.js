import React, { Component } from "react";
import {getMembers} from "../../services/apiServices";
import {getCategories} from "../../services/apiServices";
import {addExpense} from "../../services/apiServices";
import { Container, Paper, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

import Navbar from "../../components/Navbar/Navbar";

class AddExpensePage extends Component {

    constructor(props) {
        super(props);

        this.state = {

            amount: "",
            categoryId: "",
            paidBy: "",
            date: "",
            description: "",
            splitType: "EQUAL",
            members: [],
            categories: [],
            splits: []
        };
}

    

    componentDidMount() {
        getMembers()
            .then((response) => {this.setState({
                    members: response.data
                });
                // console.log(response.data);
            })
            .catch((error) => {
                console.error(error);
            });

        getCategories()
            .then((response) => {
                this.setState({
                    categories: response.data
                });
                // console.log(response.data);
            })
            .catch((error) => {
                console.error(error);
            });

    // Promise.all([
    //     getMembers(),
    //     getCategories()
    // ])
    // .then(([membersResponse, categoriesResponse]) => {

    //     this.setState({
    //         members: membersResponse.data,
    //         categories: categoriesResponse.data
    //     });
    //     console.log(membersResponse.data);
    //     console.log(categoriesResponse.data);
    // })
    // .catch((error) => {
    //     console.error(error);
    // });
    }

    handleChange = (event) => {
        this.setState({     
            [event.target.name] : event.target.value
        });
    }

    handleSplitTypeChange = (event) => {
        const splitType = event.target.value;

        this.setState({splitType});

        if (splitType === "CUSTOM") {
            const splits = this.state.members.map(member => ({
            memberId: member.member_id,
            share: ""
            }));

            this.setState({
                splitType,
                splits
        });
    }
}


handleSplitAmountChange = (index, value) => {
    const splits = [...this.state.splits];
    splits[index].share = value;

    this.setState({
        splits
    });
}



    handleSubmit = () => {

    const expense = {
        amount: Number(this.state.amount),
        categoryId: Number(this.state.categoryId),
        paidBy: Number(this.state.paidBy),
        date: this.state.date,
        description: this.state.description,
        splitType: this.state.splitType
    };

    if (this.state.splitType === "CUSTOM") {

    expense.splits = this.state.splits.map(split => ({
        memberId: split.memberId,
        share: Number(split.share)
        }));
    }

    console.log(expense);

    addExpense(expense)
        .then((response) => {
            alert("Expense Added Successfully");
            console.log(response.data);
            
            this.setState({
                amount: "",
                categoryId: "",
                paidBy: "",
                date: "",
                description: "",
                splitType: "EQUAL",
                members: [],
                categories: [],
                splits: []
            });
        })
        .catch((error) => {
            console.error(error);
            alert("Failed To Add Expense");
        });
    
    
};



    render() {
        
        return (
        <>
            <Navbar />

            <Container maxWidth="md">

                <Paper
                    elevation={3}
                    style={{
                        padding: "25px",
                        marginTop: "20px"
                    }}
                >

                    <Typography
                        variant="h5"
                        gutterBottom
                    >
                        Add Expense
                    </Typography>

                    <TextField
                        fullWidth
                        label="Amount"
                        name="amount"
                        value={this.state.amount}
                        onChange={this.handleChange}
                        margin="normal"
                    />

                    <FormControl
                        fullWidth
                        margin="normal"
                    >
                        
                        <InputLabel>
                            Category
                        </InputLabel>

                        <Select
                            name="categoryId"
                            value={this.state.categoryId}
                            onChange={this.handleChange}
                        >

                            {this.state.categories.map(category => (

                                <MenuItem
                                    key={category.category_id}
                                    value={category.category_id}
                                >
                                    {category.name}
                                </MenuItem>

                            ))}

                        </Select>

                    </FormControl>

                    <FormControl
                        fullWidth
                        margin="normal"
                    >
                        <InputLabel>
                            Paid By
                        </InputLabel>

                        <Select
                            name="paidBy"
                            value={this.state.paidBy}
                            onChange={this.handleChange}
                        >

                            {this.state.members.map(member => (

                                <MenuItem
                                    key={member.member_id}
                                    value={member.member_id}
                                >
                                    {member.name}
                                </MenuItem>

                            ))}

                        </Select>

                    </FormControl>

                    <TextField
                        fullWidth
                        type="date"
                        name="date"
                        value={this.state.date}
                        onChange={this.handleChange}
                        margin="normal"
                    />

                    <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={this.state.description}
                        onChange={this.handleChange}
                        margin="normal"
                    />

                    <FormControl
                        fullWidth
                        margin="normal"
                    >
                        <InputLabel>
                            Split Type
                        </InputLabel>

                        <Select
                            name="splitType"
                            value={this.state.splitType}
                            onChange={this.handleSplitTypeChange}
                        >
                            <MenuItem value="EQUAL">
                                Equal
                            </MenuItem>

                            <MenuItem value="CUSTOM">
                                Custom
                            </MenuItem>
                        </Select>
                        {
                            this.state.splitType === "CUSTOM" && (

                                <div>
                                    <h3>Custom Split</h3>
                                    <p>Expense to be split as : </p>
                                    {
                                        this.state.members.map((member, index) => (
                                            <TextField
                                                key={member.member_id}
                                                fullWidth
                                                margin="normal"
                                                label={member.name}
                                                value={this.state.splits[index]?.share || ""}
                                                onChange={(event) =>
                                                    this.handleSplitAmountChange(
                                                        index,
                                                        event.target.value
                                                    )
                                                }
                                            />

                                        ))
                                    }

                                </div>
                            )
                        }

                    </FormControl>

                    <Button
                        variant="contained"
                        fullWidth
                        onClick={this.handleSubmit}
                        style={{ marginTop: "20px" }}
                    >
                        Save Expense
                    </Button>

                </Paper>

            </Container>
        </>
    )
}
}

export default AddExpensePage;